"use server";

import { eq, inArray, like, sql } from "drizzle-orm";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getDb } from "@/db";
import {
  customers,
  products,
  productVariants,
  quotationItems,
  quotations,
  quotationStatus,
} from "@/db/schema";
import { requireStaff } from "@/lib/auth";
import { getQuotation } from "@/lib/data";
import { addDays, daysBetween, todayInBangkok } from "@/lib/dates";
import { computeTotals, VAT_BPS } from "@/lib/money";
import { quotationInput, type QuotationInput, type SaveState } from "@/lib/quotation-input";

type Db = ReturnType<typeof getDb>;

function isUniqueViolation(err: unknown): boolean {
  for (let e = err; e && typeof e === "object"; e = (e as { cause?: unknown }).cause) {
    if ((e as { code?: string }).code === "23505") return true;
  }
  return false;
}

async function nextQuotationNumber(db: Db) {
  const today = todayInBangkok();
  const prefix = `QT-${today.slice(0, 4)}${today.slice(5, 7)}-`;
  const [row] = await db
    .select({ max: sql<string | null>`max(${quotations.number})` })
    .from(quotations)
    .where(like(quotations.number, `${prefix}%`));
  const next = row?.max ? Number(row.max.slice(prefix.length)) + 1 : 1;
  return `${prefix}${String(next).padStart(4, "0")}`;
}

async function buildItems(db: Db, input: QuotationInput) {
  const variantIds = input.items.flatMap((i) => (i.variantId ? [i.variantId] : []));
  const catalogRows = variantIds.length
    ? await db
        .select({
          variantId: productVariants.id,
          productId: products.id,
          productName: products.name,
          variantLabel: productVariants.label,
          variantDetail: productVariants.detail,
          printMethod: productVariants.printMethod,
        })
        .from(productVariants)
        .innerJoin(products, eq(products.id, productVariants.productId))
        .where(inArray(productVariants.id, variantIds))
    : [];
  const byVariant = new Map(catalogRows.map((r) => [r.variantId, r]));

  return input.items.map((item, position) => {
    const lineTotalSatang = item.quantity * item.unitPriceSatang;
    if (item.variantId === null) {
      return {
        position,
        productId: null,
        variantId: null,
        description: item.description,
        variantLabel: null,
        unit: item.unit,
        quantity: item.quantity,
        unitPriceSatang: item.unitPriceSatang,
        lineTotalSatang,
      };
    }
    const row = byVariant.get(item.variantId);
    if (!row || (item.productId !== null && row.productId !== item.productId)) {
      throw new InputError("สินค้าบางรายการไม่มีในระบบแล้ว กรุณาเลือกใหม่");
    }
    const variantLabel = [row.variantLabel, row.variantDetail, row.printMethod]
      .filter(Boolean)
      .join(" · ");
    return {
      position,
      productId: row.productId,
      variantId: row.variantId,
      description: row.productName,
      variantLabel,
      unit: item.unit,
      quantity: item.quantity,
      unitPriceSatang: item.unitPriceSatang,
      lineTotalSatang,
    };
  });
}

class InputError extends Error {}

export async function saveQuotation(_prev: SaveState, formData: FormData): Promise<SaveState> {
  await requireStaff();
  let parsed: QuotationInput;
  try {
    const result = quotationInput.safeParse(JSON.parse(String(formData.get("payload"))));
    if (!result.success) {
      return { ok: false, message: result.error.issues[0]?.message ?? "ข้อมูลไม่ครบถ้วน" };
    }
    parsed = result.data;
  } catch {
    return { ok: false, message: "อ่านข้อมูลฟอร์มไม่ได้ ลองรีเฟรชหน้าแล้วบันทึกอีกครั้ง" };
  }

  const db = getDb();
  let id: string;
  try {
    const items = await buildItems(db, parsed);
    const totals = computeTotals(items, parsed.discountBps, parsed.vatMode, VAT_BPS);
    const c = parsed.customer;

    let customerId = parsed.customerId;
    if (customerId === null && parsed.saveCustomer) {
      const [created] = await db
        .insert(customers)
        .values({
          name: c.name,
          company: c.company || null,
          taxId: c.taxId || null,
          phone: c.phone || null,
          email: c.email || null,
          address: c.address || null,
        })
        .returning({ id: customers.id });
      customerId = created.id;
    }

    const fields = {
      customerId,
      customerName: c.name,
      customerCompany: c.company || null,
      customerTaxId: c.taxId || null,
      customerPhone: c.phone || null,
      customerEmail: c.email || null,
      customerAddress: c.address || null,
      issueDate: parsed.issueDate,
      validUntil: parsed.validUntil,
      discountBps: parsed.discountBps,
      vatMode: parsed.vatMode,
      vatBps: VAT_BPS,
      notes: parsed.notes || null,
      subtotalSatang: totals.subtotal,
      discountSatang: totals.discount,
      vatSatang: totals.vat,
      totalSatang: totals.total,
    };

    if (parsed.id) {
      id = parsed.id;
      const [existing] = await db
        .select({ id: quotations.id })
        .from(quotations)
        .where(eq(quotations.id, id));
      if (!existing) return { ok: false, message: "ไม่พบใบเสนอราคานี้ อาจถูกลบไปแล้ว" };
      await db.batch([
        db
          .update(quotations)
          .set({ ...fields, updatedAt: new Date() })
          .where(eq(quotations.id, id)),
        db.delete(quotationItems).where(eq(quotationItems.quotationId, id)),
        db.insert(quotationItems).values(items.map((i) => ({ ...i, quotationId: id }))),
      ]);
    } else {
      id = crypto.randomUUID();
      for (let attempt = 1; ; attempt++) {
        const number = await nextQuotationNumber(db);
        try {
          await db.batch([
            db.insert(quotations).values({ id, number, ...fields }),
            db.insert(quotationItems).values(items.map((i) => ({ ...i, quotationId: id }))),
          ]);
          break;
        } catch (err) {
          if (attempt < 3 && isUniqueViolation(err)) continue;
          throw err;
        }
      }
    }
  } catch (err) {
    if (err instanceof InputError) return { ok: false, message: err.message };
    console.error("saveQuotation failed", err);
    return { ok: false, message: "บันทึกไม่สำเร็จ ระบบฐานข้อมูลไม่ตอบสนอง ลองอีกครั้งในอีกสักครู่" };
  }

  redirect(`/quotations/${id}`);
}

const statusInput = z.object({
  id: z.uuid(),
  status: z.enum(quotationStatus.enumValues),
});

export async function setQuotationStatus(id: string, status: string) {
  await requireStaff();
  const parsed = statusInput.parse({ id, status });
  await getDb()
    .update(quotations)
    .set({ status: parsed.status, updatedAt: new Date() })
    .where(eq(quotations.id, parsed.id));
  refresh();
}

export async function duplicateQuotation(sourceId: string) {
  await requireStaff();
  const found = await getQuotation(z.uuid().parse(sourceId));
  if (!found) throw new Error("Quotation not found");
  const { items: sourceItems, ...source } = found;

  const db = getDb();
  const id = crypto.randomUUID();
  const issueDate = todayInBangkok();
  const validUntil = addDays(issueDate, Math.max(daysBetween(source.issueDate, source.validUntil), 0));

  for (let attempt = 1; ; attempt++) {
    const number = await nextQuotationNumber(db);
    try {
      await db.batch([
        db.insert(quotations).values({
          ...source,
          id,
          number,
          status: "draft",
          issueDate,
          validUntil,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
        db.insert(quotationItems).values(
          sourceItems.map((item) => ({
            position: item.position,
            productId: item.productId,
            variantId: item.variantId,
            description: item.description,
            variantLabel: item.variantLabel,
            unit: item.unit,
            quantity: item.quantity,
            unitPriceSatang: item.unitPriceSatang,
            lineTotalSatang: item.lineTotalSatang,
            quotationId: id,
          })),
        ),
      ]);
      break;
    } catch (err) {
      if (attempt < 3 && isUniqueViolation(err)) continue;
      throw err;
    }
  }

  redirect(`/quotations/${id}/edit`);
}
