import { readFileSync } from "node:fs";
import { inArray, sql } from "drizzle-orm";
import { getDb } from "../src/db";
import { priceTiers, products, productVariants } from "../src/db/schema";
import { normaliseCatalog, type SourceCatalog } from "../src/lib/catalog-import";

// Idempotent: upserts products and variants by natural key, then replaces each variant's tiers.
async function main() {
  const source = JSON.parse(
    readFileSync("data/theorangepack-catalog.json", "utf8"),
  ) as SourceCatalog;
  const catalog = normaliseCatalog(source);
  const db = getDb();

  for (const [sortOrder, p] of catalog.entries()) {
    const [product] = await db
      .insert(products)
      .values({
        slug: p.slug,
        name: p.name,
        category: p.category,
        summary: p.summary,
        image: p.image,
        moq: p.moq,
        leadDays: p.leadDays,
        sortOrder,
      })
      .onConflictDoUpdate({
        target: products.slug,
        set: {
          name: p.name,
          category: p.category,
          summary: p.summary,
          image: p.image,
          moq: p.moq,
          leadDays: p.leadDays,
          sortOrder,
        },
      })
      .returning({ id: products.id });

    const variants = await db
      .insert(productVariants)
      .values(
        p.variants.map((v, i) => ({
          productId: product.id,
          code: v.code,
          label: v.label,
          detail: v.detail,
          printMethod: v.printMethod,
          sortOrder: i,
        })),
      )
      .onConflictDoUpdate({
        target: [productVariants.productId, productVariants.code],
        set: {
          label: sql`excluded.label`,
          detail: sql`excluded.detail`,
          printMethod: sql`excluded.print_method`,
          sortOrder: sql`excluded.sort_order`,
        },
      })
      .returning({ id: productVariants.id, code: productVariants.code });

    const idByCode = new Map(variants.map((v) => [v.code, v.id]));
    await db.delete(priceTiers).where(
      inArray(
        priceTiers.variantId,
        variants.map((v) => v.id),
      ),
    );
    await db.insert(priceTiers).values(
      p.variants.flatMap((v) =>
        v.tiers.map((t) => ({ variantId: idByCode.get(v.code)!, ...t })),
      ),
    );

    const tierCount = p.variants.reduce((n, v) => n + v.tiers.length, 0);
    console.log(`✓ ${p.name} — ${p.variants.length} variants, ${tierCount} tiers`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
