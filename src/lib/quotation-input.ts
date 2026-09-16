import { z } from "zod";

const optionalText = (max: number) => z.string().trim().max(max);

export const quotationItemInput = z.object({
  productId: z.number().int().positive().nullable(),
  variantId: z.number().int().positive().nullable(),
  description: optionalText(300),
  unit: z.string().trim().min(1, "ระบุหน่วย").max(20),
  quantity: z.number().int().positive("จำนวนต้องมากกว่า 0").max(10_000_000),
  unitPriceSatang: z.number().int().min(0).max(100_000_000),
});

export const quotationInput = z
  .object({
    id: z.uuid().nullable(),
    customerId: z.number().int().positive().nullable(),
    saveCustomer: z.boolean(),
    customer: z.object({
      name: z.string().trim().min(1, "กรอกชื่อผู้ติดต่อ").max(200),
      company: optionalText(200),
      taxId: optionalText(20),
      phone: optionalText(40),
      email: z.union([z.literal(""), z.email("อีเมลไม่ถูกต้อง")]),
      address: optionalText(500),
    }),
    issueDate: z.iso.date(),
    validUntil: z.iso.date(),
    discountBps: z.number().int().min(0).max(10_000),
    vatMode: z.enum(["exclusive", "none"]),
    notes: optionalText(2000),
    items: z.array(quotationItemInput).min(1, "เพิ่มอย่างน้อย 1 รายการ").max(100),
  })
  .refine((q) => q.validUntil >= q.issueDate, {
    message: "วันยืนราคาต้องไม่ก่อนวันที่ออกเอกสาร",
    path: ["validUntil"],
  })
  .refine((q) => q.items.every((i) => i.variantId !== null || i.description.length > 0), {
    message: "รายการที่ไม่ได้เลือกสินค้าต้องมีคำอธิบาย",
    path: ["items"],
  });

export type QuotationInput = z.infer<typeof quotationInput>;

export type SaveState = { ok: false; message: string } | null;
