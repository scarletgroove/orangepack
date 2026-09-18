"use client";

import { Ban, CheckCircle2, Factory, PackageCheck, Printer, RotateCcw, Trash2, Truck } from "lucide-react";
import { useState, useTransition } from "react";
import { deleteOrder, setOrderStatus } from "@/app/(app)/orders/actions";
import type { SalesOrderStatus } from "@/db/schema";

const transitions: Record<
  SalesOrderStatus,
  { to: SalesOrderStatus; label: string; icon: typeof Factory; primary?: boolean }[]
> = {
  awaiting_production: [
    { to: "in_production", label: "เริ่มผลิต", icon: Factory, primary: true },
    { to: "cancelled", label: "ยกเลิก", icon: Ban },
  ],
  in_production: [
    { to: "ready", label: "ผลิตเสร็จ", icon: PackageCheck, primary: true },
    { to: "awaiting_production", label: "ย้อนเป็นรอผลิต", icon: RotateCcw },
    { to: "cancelled", label: "ยกเลิก", icon: Ban },
  ],
  ready: [
    { to: "delivered", label: "ส่งแล้ว", icon: Truck, primary: true },
    { to: "in_production", label: "ย้อนเป็นกำลังผลิต", icon: RotateCcw },
  ],
  delivered: [{ to: "ready", label: "ย้อนเป็นผลิตเสร็จ", icon: RotateCcw }],
  cancelled: [{ to: "awaiting_production", label: "เปิดใบสั่งขายอีกครั้ง", icon: CheckCircle2 }],
};

export function OrderActions({ id, status }: { id: string; status: SalesOrderStatus }) {
  const [pending, startTransition] = useTransition();
  // Deleting is permanent, so the button asks once before it does anything.
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  return (
    <div className="page__actions no-print" aria-busy={pending}>
      {transitions[status].map(({ to, label, icon: Icon, primary }) => (
        <button
          key={to}
          type="button"
          className={`btn btn--sm ${primary ? "btn--primary" : "btn--quiet"}`}
          disabled={pending}
          onClick={() => startTransition(() => setOrderStatus(id, to))}
        >
          <Icon size={16} aria-hidden />
          {label}
        </button>
      ))}
      <button type="button" className="btn btn--sm btn--quiet" onClick={() => window.print()}>
        <Printer size={16} aria-hidden />
        พิมพ์ / PDF
      </button>
      {status === "cancelled" &&
        (confirmingDelete ? (
          <>
            <button
              type="button"
              className="btn btn--sm btn--danger"
              disabled={pending}
              onClick={() => startTransition(() => deleteOrder(id))}
            >
              <Trash2 size={16} aria-hidden />
              ยืนยันลบถาวร
            </button>
            <button
              type="button"
              className="btn btn--sm btn--ghost"
              disabled={pending}
              onClick={() => setConfirmingDelete(false)}
            >
              ไม่ลบ
            </button>
          </>
        ) : (
          <button type="button" className="btn btn--sm btn--ghost" onClick={() => setConfirmingDelete(true)}>
            <Trash2 size={16} aria-hidden />
            ลบถาวร
          </button>
        ))}
    </div>
  );
}
