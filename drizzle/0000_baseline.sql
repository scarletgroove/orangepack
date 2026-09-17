CREATE TYPE "public"."quotation_status" AS ENUM('draft', 'sent', 'accepted', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."vat_mode" AS ENUM('exclusive', 'none');--> statement-breakpoint
CREATE TABLE "customers" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"company" text,
	"tax_id" text,
	"phone" text,
	"email" text,
	"address" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "price_tiers" (
	"id" serial PRIMARY KEY NOT NULL,
	"variant_id" integer NOT NULL,
	"min_qty" integer NOT NULL,
	"unit_price_satang" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_variants" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" integer NOT NULL,
	"code" text NOT NULL,
	"label" text NOT NULL,
	"detail" text,
	"print_method" text,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"summary" text,
	"image" text,
	"moq" integer NOT NULL,
	"lead_days" integer,
	"sort_order" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "products_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "quotation_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"quotation_id" uuid NOT NULL,
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
CREATE TABLE "quotations" (
	"id" uuid PRIMARY KEY NOT NULL,
	"number" text NOT NULL,
	"status" "quotation_status" DEFAULT 'draft' NOT NULL,
	"customer_id" integer,
	"customer_name" text NOT NULL,
	"customer_company" text,
	"customer_tax_id" text,
	"customer_phone" text,
	"customer_email" text,
	"customer_address" text,
	"issue_date" date NOT NULL,
	"valid_until" date NOT NULL,
	"discount_bps" integer DEFAULT 0 NOT NULL,
	"vat_mode" "vat_mode" DEFAULT 'exclusive' NOT NULL,
	"vat_bps" integer DEFAULT 700 NOT NULL,
	"notes" text,
	"subtotal_satang" bigint NOT NULL,
	"discount_satang" bigint NOT NULL,
	"vat_satang" bigint NOT NULL,
	"total_satang" bigint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "quotations_number_unique" UNIQUE("number")
);
--> statement-breakpoint
ALTER TABLE "price_tiers" ADD CONSTRAINT "price_tiers_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotation_items" ADD CONSTRAINT "quotation_items_quotation_id_quotations_id_fk" FOREIGN KEY ("quotation_id") REFERENCES "public"."quotations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotation_items" ADD CONSTRAINT "quotation_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotation_items" ADD CONSTRAINT "quotation_items_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "price_tiers_variant_qty" ON "price_tiers" USING btree ("variant_id","min_qty");--> statement-breakpoint
CREATE UNIQUE INDEX "product_variants_product_code" ON "product_variants" USING btree ("product_id","code");--> statement-breakpoint
CREATE INDEX "quotation_items_quotation_idx" ON "quotation_items" USING btree ("quotation_id");--> statement-breakpoint
CREATE INDEX "quotations_status_idx" ON "quotations" USING btree ("status");--> statement-breakpoint
CREATE INDEX "quotations_created_idx" ON "quotations" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "quotations_customer_idx" ON "quotations" USING btree ("customer_id");