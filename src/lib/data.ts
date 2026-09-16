import { and, asc, count, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import { getDb } from "@/db";
import {
  customers,
  priceTiers,
  products,
  productVariants,
  quotationItems,
  quotations,
  type QuotationStatus,
} from "@/db/schema";

export type CatalogVariant = {
  id: number;
  code: string;
  label: string;
  detail: string | null;
  printMethod: string | null;
  tiers: { minQty: number; unitPriceSatang: number }[];
};

export type CatalogProduct = {
  id: number;
  slug: string;
  name: string;
  category: string;
  summary: string | null;
  image: string | null;
  moq: number;
  leadDays: number | null;
  variants: CatalogVariant[];
};

export async function getCatalog(): Promise<CatalogProduct[]> {
  const db = getDb();
  const [productRows, variantRows, tierRows] = await Promise.all([
    db.select().from(products).orderBy(asc(products.sortOrder)),
    db.select().from(productVariants).orderBy(asc(productVariants.sortOrder)),
    db.select().from(priceTiers).orderBy(asc(priceTiers.minQty)),
  ]);

  const tiersByVariant = Map.groupBy(tierRows, (t) => t.variantId);
  const variantsByProduct = Map.groupBy(variantRows, (v) => v.productId);

  return productRows.map((p) => ({
    id: p.id,
    slug: p.slug,
    name: p.name,
    category: p.category,
    summary: p.summary,
    image: p.image,
    moq: p.moq,
    leadDays: p.leadDays,
    variants: (variantsByProduct.get(p.id) ?? []).map((v) => ({
      id: v.id,
      code: v.code,
      label: v.label,
      detail: v.detail,
      printMethod: v.printMethod,
      tiers: (tiersByVariant.get(v.id) ?? []).map((t) => ({
        minQty: t.minQty,
        unitPriceSatang: t.unitPriceSatang,
      })),
    })),
  }));
}

export type CustomerRecord = typeof customers.$inferSelect;

export async function getCustomers() {
  return getDb().select().from(customers).orderBy(asc(customers.name));
}

export async function getCustomersWithActivity() {
  const db = getDb();
  return db
    .select({
      id: customers.id,
      name: customers.name,
      company: customers.company,
      phone: customers.phone,
      email: customers.email,
      quotationCount: count(quotations.id),
      lastIssued: sql<string | null>`max(${quotations.issueDate})`,
    })
    .from(customers)
    .leftJoin(quotations, eq(quotations.customerId, customers.id))
    .groupBy(customers.id)
    .orderBy(asc(customers.name));
}

export const STATUS_FILTERS = ["draft", "sent", "accepted", "rejected"] as const;

export async function listQuotations(filter: { status?: QuotationStatus; q?: string }) {
  const db = getDb();
  const conditions: SQL[] = [];
  if (filter.status) conditions.push(eq(quotations.status, filter.status));
  if (filter.q) {
    const term = `%${filter.q.replace(/[%_\\]/g, "\\$&")}%`;
    conditions.push(
      or(
        ilike(quotations.number, term),
        ilike(quotations.customerName, term),
        ilike(quotations.customerCompany, term),
      )!,
    );
  }
  return db
    .select({
      id: quotations.id,
      number: quotations.number,
      status: quotations.status,
      customerName: quotations.customerName,
      customerCompany: quotations.customerCompany,
      issueDate: quotations.issueDate,
      validUntil: quotations.validUntil,
      totalSatang: quotations.totalSatang,
    })
    .from(quotations)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(quotations.createdAt))
    .limit(200);
}

export async function getQuotationStats() {
  return getDb()
    .select({
      status: quotations.status,
      count: count(),
      totalSatang: sql<string>`coalesce(sum(${quotations.totalSatang}), 0)`,
    })
    .from(quotations)
    .groupBy(quotations.status);
}

export async function getQuotation(id: string) {
  const db = getDb();
  const [quotation] = await db.select().from(quotations).where(eq(quotations.id, id));
  if (!quotation) return null;
  const items = await db
    .select()
    .from(quotationItems)
    .where(eq(quotationItems.quotationId, id))
    .orderBy(asc(quotationItems.position));
  return { ...quotation, items };
}

export type QuotationWithItems = NonNullable<Awaited<ReturnType<typeof getQuotation>>>;
