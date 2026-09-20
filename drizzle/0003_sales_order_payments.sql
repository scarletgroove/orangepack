CREATE TYPE "public"."payment_method" AS ENUM('transfer', 'cash', 'cheque', 'card', 'other');--> statement-breakpoint
CREATE TABLE "sales_order_payments" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" uuid NOT NULL,
	"paid_on" date NOT NULL,
	"amount_satang" bigint NOT NULL,
	"method" "payment_method" DEFAULT 'transfer' NOT NULL,
	"reference" text,
	"note" text,
	"created_by_email" text,
	"created_by_name" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sales_order_payments" ADD CONSTRAINT "sales_order_payments_order_id_sales_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."sales_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "sales_order_payments_order_idx" ON "sales_order_payments" USING btree ("order_id","paid_on");--> statement-breakpoint
-- Carry each order's running paid total over as one opening ledger row, so no recorded money is lost.
INSERT INTO "sales_order_payments" ("order_id", "paid_on", "amount_satang", "method", "note")
SELECT "id", "order_date", "paid_satang", 'other', 'ยอดยกมาก่อนเริ่มบันทึกการชำระเงินเป็นรายรายการ'
FROM "sales_orders"
WHERE "paid_satang" > 0;
