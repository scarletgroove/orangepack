import {
  bigint,
  date,
  index,
  integer,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const quotationStatus = pgEnum("quotation_status", [
  "draft",
  "sent",
  "accepted",
  "rejected",
]);

export const vatMode = pgEnum("vat_mode", ["exclusive", "none"]);

export const salesOrderStatus = pgEnum("sales_order_status", [
  "awaiting_production",
  "in_production",
  "ready",
  "delivered",
  "cancelled",
]);

export const customers = pgTable("customers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  company: text("company"),
  taxId: text("tax_id"),
  phone: text("phone"),
  email: text("email"),
  address: text("address"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  summary: text("summary"),
  image: text("image"),
  moq: integer("moq").notNull(),
  leadDays: integer("lead_days"),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const productVariants = pgTable(
  "product_variants",
  {
    id: serial("id").primaryKey(),
    productId: integer("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    label: text("label").notNull(),
    detail: text("detail"),
    printMethod: text("print_method"),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [uniqueIndex("product_variants_product_code").on(t.productId, t.code)],
);

// Unit prices are stored in satang (1 THB = 100 satang) so money math stays in integers.
export const priceTiers = pgTable(
  "price_tiers",
  {
    id: serial("id").primaryKey(),
    variantId: integer("variant_id")
      .notNull()
      .references(() => productVariants.id, { onDelete: "cascade" }),
    minQty: integer("min_qty").notNull(),
    unitPriceSatang: integer("unit_price_satang").notNull(),
  },
  (t) => [uniqueIndex("price_tiers_variant_qty").on(t.variantId, t.minQty)],
);

// Customer fields are snapshotted so an issued quotation never changes when the customer record does.
export const quotations = pgTable(
  "quotations",
  {
    id: uuid("id").primaryKey(),
    number: text("number").notNull().unique(),
    status: quotationStatus("status").notNull().default("draft"),
    customerId: integer("customer_id").references(() => customers.id, {
      onDelete: "set null",
    }),
    customerName: text("customer_name").notNull(),
    customerCompany: text("customer_company"),
    customerTaxId: text("customer_tax_id"),
    customerPhone: text("customer_phone"),
    customerEmail: text("customer_email"),
    customerAddress: text("customer_address"),
    issueDate: date("issue_date").notNull(),
    validUntil: date("valid_until").notNull(),
    discountBps: integer("discount_bps").notNull().default(0),
    vatMode: vatMode("vat_mode").notNull().default("exclusive"),
    vatBps: integer("vat_bps").notNull().default(700),
    notes: text("notes"),
    subtotalSatang: bigint("subtotal_satang", { mode: "number" }).notNull(),
    discountSatang: bigint("discount_satang", { mode: "number" }).notNull(),
    vatSatang: bigint("vat_satang", { mode: "number" }).notNull(),
    totalSatang: bigint("total_satang", { mode: "number" }).notNull(),
    // Staff email + display name at the time of the change. Null on quotations made before tracking existed.
    createdByEmail: text("created_by_email"),
    createdByName: text("created_by_name"),
    updatedByEmail: text("updated_by_email"),
    updatedByName: text("updated_by_name"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("quotations_status_idx").on(t.status),
    index("quotations_created_idx").on(t.createdAt),
    index("quotations_customer_idx").on(t.customerId),
  ],
);

export const quotationItems = pgTable(
  "quotation_items",
  {
    id: serial("id").primaryKey(),
    quotationId: uuid("quotation_id")
      .notNull()
      .references(() => quotations.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    productId: integer("product_id").references(() => products.id, {
      onDelete: "set null",
    }),
    variantId: integer("variant_id").references(() => productVariants.id, {
      onDelete: "set null",
    }),
    description: text("description").notNull(),
    variantLabel: text("variant_label"),
    unit: text("unit").notNull().default("ใบ"),
    quantity: integer("quantity").notNull(),
    unitPriceSatang: integer("unit_price_satang").notNull(),
    lineTotalSatang: bigint("line_total_satang", { mode: "number" }).notNull(),
  },
  (t) => [index("quotation_items_quotation_idx").on(t.quotationId)],
);

export type QuotationStatus = (typeof quotationStatus.enumValues)[number];
export type VatMode = (typeof vatMode.enumValues)[number];

// A sales order is the accepted quotation turned into work: what to produce, when it is due, what has been paid.
// Customer and line details are snapshotted the same way quotations snapshot them, so later catalog or
// customer edits never change an order the customer already agreed to.
export const salesOrders = pgTable(
  "sales_orders",
  {
    id: uuid("id").primaryKey(),
    number: text("number").notNull().unique(),
    status: salesOrderStatus("status").notNull().default("awaiting_production"),
    // The quotation this came from. Kept nullable so an order survives a deleted quotation.
    quotationId: uuid("quotation_id").references(() => quotations.id, { onDelete: "set null" }),
    quotationNumber: text("quotation_number"),
    customerId: integer("customer_id").references(() => customers.id, { onDelete: "set null" }),
    customerName: text("customer_name").notNull(),
    customerCompany: text("customer_company"),
    customerTaxId: text("customer_tax_id"),
    customerPhone: text("customer_phone"),
    customerEmail: text("customer_email"),
    customerAddress: text("customer_address"),
    orderDate: date("order_date").notNull(),
    dueDate: date("due_date"),
    discountBps: integer("discount_bps").notNull().default(0),
    vatMode: vatMode("vat_mode").notNull().default("exclusive"),
    vatBps: integer("vat_bps").notNull().default(700),
    notes: text("notes"),
    subtotalSatang: bigint("subtotal_satang", { mode: "number" }).notNull(),
    discountSatang: bigint("discount_satang", { mode: "number" }).notNull(),
    vatSatang: bigint("vat_satang", { mode: "number" }).notNull(),
    totalSatang: bigint("total_satang", { mode: "number" }).notNull(),
    // Deposit asked for up front, as basis points of the total (5000 = 50%). Paid is the running total received.
    depositBps: integer("deposit_bps").notNull().default(0),
    paidSatang: bigint("paid_satang", { mode: "number" }).notNull().default(0),
    createdByEmail: text("created_by_email"),
    createdByName: text("created_by_name"),
    updatedByEmail: text("updated_by_email"),
    updatedByName: text("updated_by_name"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("sales_orders_status_idx").on(t.status),
    index("sales_orders_created_idx").on(t.createdAt),
    index("sales_orders_customer_idx").on(t.customerId),
    index("sales_orders_due_idx").on(t.dueDate),
    // One order per quotation; Postgres treats nulls as distinct, so orders made without a quotation are unaffected.
    uniqueIndex("sales_orders_quotation_idx").on(t.quotationId),
  ],
);

export const salesOrderItems = pgTable(
  "sales_order_items",
  {
    id: serial("id").primaryKey(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => salesOrders.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    productId: integer("product_id").references(() => products.id, { onDelete: "set null" }),
    variantId: integer("variant_id").references(() => productVariants.id, { onDelete: "set null" }),
    description: text("description").notNull(),
    variantLabel: text("variant_label"),
    unit: text("unit").notNull().default("ใบ"),
    quantity: integer("quantity").notNull(),
    unitPriceSatang: integer("unit_price_satang").notNull(),
    lineTotalSatang: bigint("line_total_satang", { mode: "number" }).notNull(),
  },
  (t) => [index("sales_order_items_order_idx").on(t.orderId)],
);

export type SalesOrderStatus = (typeof salesOrderStatus.enumValues)[number];
