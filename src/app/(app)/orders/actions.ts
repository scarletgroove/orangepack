"use server";

import { eq, like, sql } from "drizzle-orm";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getDb } from "@/db";
import {
  salesOrderItems,
  salesOrders,
  salesOrderStatus,
  type SalesOrderStatus,
} from "@/db/schema";
import { requireStaff } from "@/lib/auth";
import { getOrderForQuotation, getQuotation, getSalesOrder } from "@/lib/data";
import { todayInBangkok } from "@/lib/dates";
import { recomputeOrderMoney } from "@/lib/order-math";
import { DEFAULT_DEPOSIT_BPS, isItemsEditable, orderDetailsInput, orderItemsInput } from "@/lib/order-input";
import type { SaveState } from "@/lib/quotation-input";

type Db = ReturnType<typeof getDb>;

function isUniqueViolation(err: unknown): boolean {
  for (let e = err; e && typeof e === "object"; e = (e as { cause?: unknown }).cause) {
    if ((e as { code?: string }).code === "23505") return true;
  }
  return false;
}

async function nextOrderNumber(db: Db) {
  const today = todayInBangkok();
  const prefix = `SO-${today.slice(0, 4)}${today.slice(5, 7)}-`;
  const [row] = await db
    .select({ max: sql<string | null>`max(${salesOrders.number})` })
    .from(salesOrders)
    .where(like(salesOrders.number, `${prefix}%`));
  const next = row?.max ? Number(row.max.slice(prefix.length)) + 1 : 1;
  return `${prefix}${String(next).padStart(4, "0")}`;
}

/** Turns an accepted quotation into a sales order. One order per quotation: an existing one is opened instead. */
export async function createOrderFromQuotation(quotationId: string) {
  const by = await requireStaff();
  const id = z.uuid().parse(quotationId);

  const existing = await getOrderForQuotation(id);
  if (existing) redirect(`/orders/${existing.id}`);

  const quotation = await getQuotation(id);
  if (!quotation) throw new Error("Quotation not found");
  if (quotation.status !== "accepted") {
    throw new Error("Only an accepted quotation can become a sales order");
  }

  const db = getDb();
  const orderId = crypto.randomUUID();
  const orderDate = todayInBangkok();

  for (let attempt = 1; ; attempt++) {
    const number = await nextOrderNumber(db);
    try {
      await db.batch([
        db.insert(salesOrders).values({
          id: orderId,
          number,
          quotationId: quotation.id,
          quotationNumber: quotation.number,
          customerId: quotation.customerId,
          customerName: quotation.customerName,
          customerCompany: quotation.customerCompany,
          customerTaxId: quotation.customerTaxId,
          customerPhone: quotation.customerPhone,
          customerEmail: quotation.customerEmail,
          customerAddress: quotation.customerAddress,
          orderDate,
          dueDate: null,
          discountBps: quotation.discountBps,
          vatMode: quotation.vatMode,
          vatBps: quotation.vatBps,
          notes: quotation.notes,
          subtotalSatang: quotation.subtotalSatang,
          discountSatang: quotation.discountSatang,
          vatSatang: quotation.vatSatang,
          totalSatang: quotation.totalSatang,
          depositBps: DEFAULT_DEPOSIT_BPS,
          paidSatang: 0,
          createdByEmail: by.email,
          createdByName: by.name,
          updatedByEmail: by.email,
          updatedByName: by.name,
        }),
        db.insert(salesOrderItems).values(
          quotation.items.map((item) => ({
            orderId,
            position: item.position,
            productId: item.productId,
            variantId: item.variantId,
            description: item.description,
            variantLabel: item.variantLabel,
            unit: item.unit,
            quantity: item.quantity,
            unitPriceSatang: item.unitPriceSatang,
            lineTotalSatang: item.lineTotalSatang,
          })),
        ),
      ]);
      break;
    } catch (err) {
      // A second staff member converting the same quotation trips the one-order-per-quotation index.
      if (isUniqueViolation(err)) {
        const other = await getOrderForQuotation(id);
        if (other) redirect(`/orders/${other.id}`);
        if (attempt < 3) continue;
      }
      throw err;
    }
  }

  redirect(`/orders/${orderId}`);
}

// Forward steps plus one step back, so a mistake can be undone without deleting the order.
const allowedTransitions: Record<SalesOrderStatus, SalesOrderStatus[]> = {
  awaiting_production: ["in_production", "cancelled"],
  in_production: ["ready", "awaiting_production", "cancelled"],
  ready: ["delivered", "in_production"],
  delivered: ["ready"],
  cancelled: ["awaiting_production"],
};

const statusInput = z.object({ id: z.uuid(), status: z.enum(salesOrderStatus.enumValues) });

export async function setOrderStatus(id: string, status: string) {
  const by = await requireStaff();
  const parsed = statusInput.parse({ id, status });
  const db = getDb();

  const [current] = await db
    .select({ status: salesOrders.status })
    .from(salesOrders)
    .where(eq(salesOrders.id, parsed.id));
  if (!current) throw new Error("Sales order not found");
  if (!allowedTransitions[current.status].includes(parsed.status)) {
    throw new Error(`Cannot move an order from ${current.status} to ${parsed.status}`);
  }

  await db
    .update(salesOrders)
    .set({
      status: parsed.status,
      updatedAt: new Date(),
      updatedByEmail: by.email,
      updatedByName: by.name,
    })
    .where(eq(salesOrders.id, parsed.id));
  refresh();
}

/** Due date, deposit, payment received and the production note. Editable at any status except cancelled. */
export async function updateOrderDetails(_prev: SaveState, formData: FormData): Promise<SaveState> {
  const by = await requireStaff();
  const result = orderDetailsInput.safeParse({
    id: formData.get("id"),
    dueDate: formData.get("dueDate"),
    depositPercent: formData.get("depositPercent"),
    paidBaht: formData.get("paidBaht"),
    notes: formData.get("notes"),
  });
  if (!result.success) return { ok: false, message: result.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง" };
  const input = result.data;

  const db = getDb();
  const [order] = await db
    .select({ status: salesOrders.status, totalSatang: salesOrders.totalSatang, orderDate: salesOrders.orderDate })
    .from(salesOrders)
    .where(eq(salesOrders.id, input.id));
  if (!order) return { ok: false, message: "ไม่พบใบสั่งขายนี้" };
  if (order.status === "cancelled") return { ok: false, message: "ใบสั่งขายที่ยกเลิกแล้วแก้ไขไม่ได้" };
  if (input.dueDate && input.dueDate < order.orderDate) {
    return { ok: false, message: "กำหนดส่งต้องไม่ก่อนวันที่เปิดใบสั่งขาย" };
  }
  if (input.paidSatang > order.totalSatang) {
    return { ok: false, message: "ยอดชำระมากกว่ายอดรวมของใบสั่งขาย" };
  }

  try {
    await db
      .update(salesOrders)
      .set({
        dueDate: input.dueDate,
        depositBps: input.depositBps,
        paidSatang: input.paidSatang,
        notes: input.notes || null,
        updatedAt: new Date(),
        updatedByEmail: by.email,
        updatedByName: by.name,
      })
      .where(eq(salesOrders.id, input.id));
  } catch (err) {
    console.error("updateOrderDetails failed", err);
    return { ok: false, message: "บันทึกไม่สำเร็จ ลองอีกครั้งในอีกสักครู่" };
  }
  refresh();
  return null;
}

/** Quantities and prices, only while the job has not started. Totals are recomputed from the surviving lines. */
export async function updateOrderItems(_prev: SaveState, formData: FormData): Promise<SaveState> {
  const by = await requireStaff();
  const result = orderItemsInput.safeParse(JSON.parse(String(formData.get("payload") ?? "null")));
  if (!result.success) return { ok: false, message: result.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง" };
  const input = result.data;

  const order = await getSalesOrder(input.id);
  if (!order) return { ok: false, message: "ไม่พบใบสั่งขายนี้" };
  if (!isItemsEditable(order.status)) {
    return { ok: false, message: "แก้ไขรายการได้เฉพาะใบสั่งขายที่ยังรอผลิตเท่านั้น" };
  }

  const byId = new Map(order.items.map((item) => [item.id, item]));
  if (input.items.some((line) => !byId.has(line.id))) {
    return { ok: false, message: "รายการบางรายการไม่มีในใบสั่งขายแล้ว ลองรีเฟรชหน้า" };
  }
  const kept = input.items.map((line) => ({
    ...byId.get(line.id)!,
    quantity: line.quantity,
    unitPriceSatang: line.unitPriceSatang,
  }));
  const removedIds = order.items
    .filter((item) => !input.items.some((l) => l.id === item.id))
    .map((i) => i.id);
  const money = recomputeOrderMoney(kept, order);

  const db = getDb();
  const itemOps = [
    ...kept.map((item) =>
      db
        .update(salesOrderItems)
        .set({
          quantity: item.quantity,
          unitPriceSatang: item.unitPriceSatang,
          lineTotalSatang: item.quantity * item.unitPriceSatang,
        })
        .where(eq(salesOrderItems.id, item.id)),
    ),
    ...removedIds.map((itemId) => db.delete(salesOrderItems).where(eq(salesOrderItems.id, itemId))),
  ];

  try {
    await db.batch([
      db
        .update(salesOrders)
        .set({
          subtotalSatang: money.subtotalSatang,
          discountSatang: money.discountSatang,
          vatSatang: money.vatSatang,
          totalSatang: money.totalSatang,
          paidSatang: money.paidSatang,
          updatedAt: new Date(),
          updatedByEmail: by.email,
          updatedByName: by.name,
        })
        .where(eq(salesOrders.id, input.id)),
      ...itemOps,
    ]);
  } catch (err) {
    console.error("updateOrderItems failed", err);
    return { ok: false, message: "บันทึกไม่สำเร็จ ลองอีกครั้งในอีกสักครู่" };
  }
  refresh();
  return null;
}

/** Unlinks and deletes an order, e.g. one created from the wrong quotation. Items go with it. */
export async function deleteOrder(id: string) {
  await requireStaff();
  const orderId = z.uuid().parse(id);
  await getDb().delete(salesOrders).where(eq(salesOrders.id, orderId));
  redirect("/orders");
}
