import { ArrowLeft, Lock } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { z } from "zod";
import { OrderActions } from "@/components/order-actions";
import { OrderDetailsForm } from "@/components/order-details-form";
import { OrderDocument } from "@/components/order-document";
import { OrderItemsEditor } from "@/components/order-items-editor";
import { OrderStatusChip } from "@/components/order-status-chip";
import { getSalesOrder } from "@/lib/data";
import { formatThaiDateTime, todayInBangkok } from "@/lib/dates";
import { isItemsEditable } from "@/lib/order-input";

export async function generateMetadata(props: PageProps<"/orders/[id]">): Promise<Metadata> {
  const { id } = await props.params;
  if (!z.uuid().safeParse(id).success) return { title: "ไม่พบเอกสาร" };
  const order = await getSalesOrder(id);
  return { title: order ? `${order.number} · ${order.customerCompany || order.customerName}` : "ไม่พบเอกสาร" };
}

export default async function OrderPage(props: PageProps<"/orders/[id]">) {
  await connection();
  const { id } = await props.params;
  if (!z.uuid().safeParse(id).success) notFound();
  const order = await getSalesOrder(id);
  if (!order) notFound();

  const editable = isItemsEditable(order.status);
  // The forms below hold typed values in client state; this key remounts them with fresh figures after every save.
  const savedAt = `${order.updatedAt.toISOString()}-${order.totalSatang}-${order.paidSatang}`;

  return (
    <div className="page page--narrow">
      <Link href="/orders" className="back-link no-print">
        <ArrowLeft size={16} aria-hidden />
        ใบสั่งขายทั้งหมด
      </Link>

      <div className="doc-toolbar no-print">
        <div className="doc-toolbar__status">
          <p className="doc-toolbar__title doc-no">{order.number}</p>
          <OrderStatusChip status={order.status} dueDate={order.dueDate} today={todayInBangkok()} />
        </div>
        <OrderActions id={order.id} status={order.status} />
      </div>

      <p className="doc-audit no-print">
        {order.createdByEmail && <>เปิดงานโดย {order.createdByName || order.createdByEmail} · </>}
        แก้ไขล่าสุด {formatThaiDateTime(order.updatedAt)}
        {order.updatedByEmail && <> โดย {order.updatedByName || order.updatedByEmail}</>}
      </p>

      <OrderDocument order={order} />

      <section className="section no-print">
        <div className="section__head">
          <h2 className="section__title">การผลิตและการชำระเงิน</h2>
        </div>
        {order.status === "cancelled" ? (
          <p className="page__lede">ใบสั่งขายนี้ถูกยกเลิกแล้ว เปิดใหม่อีกครั้งก่อนจึงจะแก้ไขได้</p>
        ) : (
          <OrderDetailsForm key={savedAt} order={order} />
        )}
      </section>

      <section className="section no-print">
        <div className="section__head">
          <h2 className="section__title">รายการสั่งผลิต</h2>
          {!editable && (
            <p className="section__note">
              <Lock size={14} aria-hidden />
              แก้ไขจำนวนและราคาได้เฉพาะตอนสถานะ “รอผลิต”
            </p>
          )}
        </div>
        {editable ? (
          <OrderItemsEditor key={savedAt} order={order} />
        ) : (
          <p className="page__lede">
            เริ่มผลิตแล้วจึงล็อกรายการไว้ ถ้าลูกค้าขอเปลี่ยน ให้ย้อนสถานะกลับเป็น “รอผลิต” ก่อน
          </p>
        )}
      </section>
    </div>
  );
}
