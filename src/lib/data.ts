import { and, asc, count, desc, eq, ilike, inArray, isNull, or, sql, type SQL } from "drizzle-orm";
import { getDb } from "@/db";
import { requireStaff } from "@/lib/auth";
import { OPEN_JOB_STATUSES } from "@/lib/jobs";
import {
  customers,
  priceTiers,
  products,
  productVariants,
  quotationItems,
  quotations,
  salesOrderItems,
  salesOrders,
  type QuotationStatus,
  type SalesOrderStatus,
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
  await requireStaff();
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
  await requireStaff();
  return getDb().select().from(customers).orderBy(asc(customers.name));
}

export async function getCustomersWithActivity() {
  await requireStaff();
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
  await requireStaff();
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
  await requireStaff();
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
  await requireStaff();
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

export const ORDER_STATUS_FILTERS = [
  "awaiting_production",
  "in_production",
  "ready",
  "delivered",
  "cancelled",
] as const;

export async function listSalesOrders(filter: { status?: SalesOrderStatus; q?: string }) {
  await requireStaff();
  const db = getDb();
  const conditions: SQL[] = [];
  if (filter.status) conditions.push(eq(salesOrders.status, filter.status));
  if (filter.q) {
    const term = `%${filter.q.replace(/[%_\\]/g, "\\$&")}%`;
    conditions.push(
      or(
        ilike(salesOrders.number, term),
        ilike(salesOrders.quotationNumber, term),
        ilike(salesOrders.customerName, term),
        ilike(salesOrders.customerCompany, term),
      )!,
    );
  }
  return db
    .select({
      id: salesOrders.id,
      number: salesOrders.number,
      status: salesOrders.status,
      customerName: salesOrders.customerName,
      customerCompany: salesOrders.customerCompany,
      orderDate: salesOrders.orderDate,
      dueDate: salesOrders.dueDate,
      totalSatang: salesOrders.totalSatang,
      paidSatang: salesOrders.paidSatang,
    })
    .from(salesOrders)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(salesOrders.createdAt))
    .limit(200);
}

export async function getSalesOrderStats() {
  await requireStaff();
  return getDb()
    .select({
      status: salesOrders.status,
      count: count(),
      totalSatang: sql<string>`coalesce(sum(${salesOrders.totalSatang}), 0)`,
      outstandingSatang: sql<string>`coalesce(sum(${salesOrders.totalSatang} - ${salesOrders.paidSatang}), 0)`,
    })
    .from(salesOrders)
    .groupBy(salesOrders.status);
}

export async function getSalesOrder(id: string) {
  await requireStaff();
  const db = getDb();
  const [order] = await db.select().from(salesOrders).where(eq(salesOrders.id, id));
  if (!order) return null;
  const items = await db
    .select()
    .from(salesOrderItems)
    .where(eq(salesOrderItems.orderId, id))
    .orderBy(asc(salesOrderItems.position));
  return { ...order, items };
}

export type SalesOrderWithItems = NonNullable<Awaited<ReturnType<typeof getSalesOrder>>>;

/** The order made from a quotation, if any — lets the quotation page link to it instead of offering to create a second one. */
export async function getOrderForQuotation(quotationId: string) {
  await requireStaff();
  const [order] = await getDb()
    .select({ id: salesOrders.id, number: salesOrders.number, status: salesOrders.status })
    .from(salesOrders)
    .where(eq(salesOrders.quotationId, quotationId));
  return order ?? null;
}

/** Accepted quotations with no order yet — work that has been agreed but not started. */
export async function countConvertibleQuotations() {
  await requireStaff();
  const [row] = await getDb()
    .select({ n: count() })
    .from(quotations)
    .leftJoin(salesOrders, eq(salesOrders.quotationId, quotations.id))
    .where(and(eq(quotations.status, "accepted"), isNull(salesOrders.id)));
  return row?.n ?? 0;
}

/** Open jobs for the dashboard, soonest promised date first, with undated ones last. */
export async function listOpenJobs() {
  await requireStaff();
  return getDb()
    .select({
      id: salesOrders.id,
      number: salesOrders.number,
      status: salesOrders.status,
      customerName: salesOrders.customerName,
      customerCompany: salesOrders.customerCompany,
      dueDate: salesOrders.dueDate,
      totalSatang: salesOrders.totalSatang,
      paidSatang: salesOrders.paidSatang,
    })
    .from(salesOrders)
    .where(inArray(salesOrders.status, [...OPEN_JOB_STATUSES]))
    .orderBy(sql`${salesOrders.dueDate} asc nulls last`, asc(salesOrders.number))
    .limit(100);
}

/** Quotations still waiting on the customer, oldest first — the follow-up list. */
export async function listPendingQuotations() {
  await requireStaff();
  return getDb()
    .select({
      id: quotations.id,
      number: quotations.number,
      customerName: quotations.customerName,
      customerCompany: quotations.customerCompany,
      issueDate: quotations.issueDate,
      validUntil: quotations.validUntil,
      totalSatang: quotations.totalSatang,
    })
    .from(quotations)
    .where(eq(quotations.status, "sent"))
    .orderBy(asc(quotations.validUntil))
    .limit(20);
}
