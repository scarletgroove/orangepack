// Normalises the storefront catalog (theorangepack.com/assets/catalog.js) into product → variant → price-tier rows.
// The storefront uses four pricing shapes, one per product template.

type Dimensions = { mouth?: number; base?: number; height?: number };
type GridVariant = Dimensions & { code: string; label: string };
type MultiVariant = GridVariant & { prices: (number | null)[] };
type PriceTable = { qtys: number[]; prices: Record<string, (number | null)[]> } | null;

export type SourceProduct = {
  slug: string;
  template: "cups-grid" | "cups-multi" | "sleeves" | "sleeves-food";
  title: string;
  titleAccent?: string;
  category: string;
  short?: string;
  image?: string;
  moqMin: number;
  leadDays?: number;
  variants?: GridVariant[];
  pricing?: Record<string, Record<string, number | null>>;
  groups?: { tiers: number[]; variants: MultiVariant[] }[];
  materialGroups?: { key: string; label: string; sizes: string[] }[];
  sizes?: { code: string; label: string; dim?: string }[];
  digital?: PriceTable;
  offset?: PriceTable;
};

export type SourceCatalog = { order: string[]; catalog: Record<string, SourceProduct> };

export type ImportTier = { minQty: number; unitPriceSatang: number };
export type ImportVariant = {
  code: string;
  label: string;
  detail: string | null;
  printMethod: string | null;
  tiers: ImportTier[];
};
export type ImportProduct = {
  slug: string;
  name: string;
  category: string;
  summary: string | null;
  image: string | null;
  moq: number;
  leadDays: number | null;
  variants: ImportVariant[];
};

const toSatang = (baht: number) => Math.round(baht * 100);

function tiersFrom(qtys: number[], prices: (number | null)[] | undefined): ImportTier[] {
  if (!prices) return [];
  return qtys
    .map((minQty, i) => ({ minQty, price: prices[i] }))
    .filter((t): t is { minQty: number; price: number } => typeof t.price === "number")
    .map((t) => ({ minQty: t.minQty, unitPriceSatang: toSatang(t.price) }))
    .sort((a, b) => a.minQty - b.minQty);
}

function dimensions(v: Dimensions) {
  const parts = [
    v.mouth ? `ปาก ${v.mouth}` : null,
    v.base ? `ก้น ${v.base}` : null,
    v.height ? `สูง ${v.height}` : null,
  ].filter(Boolean);
  return parts.length ? `${parts.join(" · ")} มม.` : null;
}

function productName(p: SourceProduct) {
  let name = p.title;
  if (p.titleAccent && !name.includes(p.titleAccent)) name += ` · ${p.titleAccent}`;
  if (p.slug.includes("kraft") && !name.includes("คราฟท์")) name += " · คราฟท์";
  return name;
}

const METHODS = [
  ["digital", "Digital"],
  ["offset", "Offset"],
] as const;

function variantsFor(p: SourceProduct): ImportVariant[] {
  switch (p.template) {
    case "cups-grid":
      return (p.variants ?? []).map((v) => {
        const row = p.pricing?.[v.code] ?? {};
        const qtys = Object.keys(row).map(Number);
        return {
          code: v.code,
          label: v.label,
          detail: dimensions(v),
          printMethod: null,
          tiers: tiersFrom(qtys, qtys.map((q) => row[String(q)] ?? null)),
        };
      });
    case "cups-multi":
      return (p.groups ?? []).flatMap((g) =>
        g.variants.map((v) => ({
          code: v.code,
          label: v.label,
          detail: dimensions(v),
          printMethod: null,
          tiers: tiersFrom(g.tiers, v.prices),
        })),
      );
    case "sleeves":
      return METHODS.flatMap(([key, method]) =>
        (p.materialGroups ?? []).flatMap((mg) =>
          mg.sizes.map((size) => ({
            code: `${key}:${mg.key}|${size}`,
            label: `${size.replace("x", " × ")} ซม.`,
            detail: mg.label,
            printMethod: method,
            tiers: tiersFrom(p[key]?.qtys ?? [], p[key]?.prices[`${mg.key}|${size}`]),
          })),
        ),
      );
    case "sleeves-food":
      return METHODS.flatMap(([key, method]) =>
        (p.sizes ?? []).map((size) => ({
          code: `${key}:${size.code}`,
          label: `ไซซ์ ${size.label}`,
          detail: size.dim ?? null,
          printMethod: method,
          tiers: tiersFrom(p[key]?.qtys ?? [], p[key]?.prices[size.code]),
        })),
      );
  }
}

export function normaliseCatalog(source: SourceCatalog): ImportProduct[] {
  return source.order.map((slug) => {
    const p = source.catalog[slug];
    return {
      slug: p.slug,
      name: productName(p),
      category: p.category,
      summary: p.short ?? null,
      image: p.image ? `/products/${p.image.split("/").pop()}` : null,
      moq: p.moqMin,
      leadDays: p.leadDays ?? null,
      variants: variantsFor(p).filter((v) => v.tiers.length > 0),
    };
  });
}
