import { z } from "zod";
import { paymentMethod, type SalesOrderStatus } from "@/db/schema";
import { parseBahtInput } from "@/lib/money";

/** Printing work is normally half up front; staff can change it per order. */
export const DEFAULT_DEPOSIT_BPS = 5000;

/** Items and prices are fixed once the job is on the machine — before that the customer can still change quantity. */
export function isItemsEditable(status: SalesOrderStatus) {
  return status === "awaiting_production";
}

const percent = z
  .string()
  .trim()
  .refine((v) => /^\d{1,3}(\.\d{1,2})?$/.test(v) && Number(v) <= 100, "มัดจำต้องเป็นตัวเลข 0–100")
  .transform((v) => Math.round(Number(v) * 100));

const baht = z
  .string()
  .trim()
  .transform((v, ctx) => {
    const satang = v === "" ? 0 : parseBahtInput(v);
    if (satang === null) {
      ctx.addIssue({ code: "custom", message: "จำนวนเงินไม่ถูกต้อง เช่น 40125.00" });
      return z.NEVER;
    }
    return satang;
  });

export const orderDetailsInput = z
  .object({
    id: z.uuid(),
    dueDate: z.union([z.literal(""), z.iso.date("กำหนดส่งไม่ถูกต้อง")]),
    depositPercent: percent,
    notes: z.string().trim().max(2000),
  })
  .transform(({ depositPercent, dueDate, ...rest }) => ({
    ...rest,
    dueDate: dueDate === "" ? null : dueDate,
    depositBps: depositPercent,
  }));

export const paymentInput = z
  .object({
    orderId: z.uuid(),
    paidOn: z.iso.date("วันที่รับชำระไม่ถูกต้อง"),
    amountBaht: baht,
    method: z.enum(paymentMethod.enumValues),
    reference: z.string().trim().max(100),
    note: z.string().trim().max(500),
  })
  .refine((p) => p.amountBaht > 0, { message: "จำนวนเงินต้องมากกว่า 0", path: ["amountBaht"] })
  .transform(({ amountBaht, reference, note, ...rest }) => ({
    ...rest,
    amountSatang: amountBaht,
    reference: reference || null,
    note: note || null,
  }));

export const deletePaymentInput = z.object({ orderId: z.uuid(), paymentId: z.number().int().positive() });

export const orderItemsInput = z.object({
  id: z.uuid(),
  items: z
    .array(
      z.object({
        id: z.number().int().positive(),
        quantity: z.number().int().positive("จำนวนต้องมากกว่า 0").max(10_000_000),
        unitPriceSatang: z.number().int().min(0).max(100_000_000),
      }),
    )
    .min(1, "ใบสั่งขายต้องมีอย่างน้อย 1 รายการ")
    .max(100),
});

export type OrderItemsInput = z.infer<typeof orderItemsInput>;
