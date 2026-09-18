CREATE TYPE "public"."sales_order_status" AS ENUM('awaiting_production', 'in_production', 'ready', 'delivered', 'cancelled');--> statement-breakpoint
CREATE TABLE "sales_order_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"product_id" integer,
	"variant_id" integer,
	"description" text NOT NULL,
	"variant_label" text,
	"unit" text DEFAULT 'ใบ' NOT NULL,
	"quantity" integer NOT NULL,
	"unit_price_satang" integer NOT NULL,
	"line_total_satang" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sales_orders" (
	"id" uuid PRIMARY KEY NOT NULL,
	"number" text NOT NULL,
	"status" "sales_order_status" DEFAULT 'awaiting_production' NOT NULL,
	"quotation_id" uuid,
	"quotation_number" text,
	"customer_id" integer,
	"customer_name" text NOT NULL,
	"customer_company" text,
	"customer_tax_id" text,
	"customer_phone" text,
	"customer_email" text,
	"customer_address" text,
	"order_date" date NOT NULL,
	"due_date" date,
	"discount_bps" integer DEFAULT 0 NOT NULL,
	"vat_mode" "vat_mode" DEFAULT 'exclusive' NOT NULL,
	"vat_bps" integer DEFAULT 700 NOT NULL,
	"notes" text,
	"subtotal_satang" bigint NOT NULL,
	"discount_satang" bigint NOT NULL,
	"vat_satang" bigint NOT NULL,
	"total_satang" bigint NOT NULL,
	"deposit_bps" integer DEFAULT 0 NOT NULL,
	"paid_satang" bigint DEFAULT 0 NOT NULL,
	"created_by_email" text,
	"created_by_name" text,
	"updated_by_email" text,
	"updated_by_name" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sales_orders_number_unique" UNIQUE("number")
);
--> statement-breakpoint
ALTER TABLE "sales_order_items" ADD CONSTRAINT "sales_order_items_order_id_sales_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."sales_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_order_items" ADD CONSTRAINT "sales_order_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_order_items" ADD CONSTRAINT "sales_order_items_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_orders" ADD CONSTRAINT "sales_orders_quotation_id_quotations_id_fk" FOREIGN KEY ("quotation_id") REFERENCES "public"."quotations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_orders" ADD CONSTRAINT "sales_orders_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "sales_order_items_order_idx" ON "sales_order_items" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "sales_orders_status_idx" ON "sales_orders" USING btree ("status");--> statement-breakpoint
CREATE INDEX "sales_orders_created_idx" ON "sales_orders" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "sales_orders_customer_idx" ON "sales_orders" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "sales_orders_due_idx" ON "sales_orders" USING btree ("due_date");--> statement-breakpoint
CREATE UNIQUE INDEX "sales_orders_quotation_idx" ON "sales_orders" USING btree ("quotation_id");