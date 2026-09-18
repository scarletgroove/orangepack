"use client";

import { ArrowRight, Check, ClipboardList, Copy, Pencil, Printer, RotateCcw, Send, X } from "lucide-react";
import Link from "next/link";
import { useTransition } from "react";
import { createOrderFromQuotation } from "@/app/(app)/orders/actions";
import { duplicateQuotation, setQuotationStatus } from "@/app/(app)/quotations/actions";
import type { QuotationStatus } from "@/db/schema";

const transitions: Record<QuotationStatus, { to: QuotationStatus; label: string; icon: typeof Send; primary?: boolean }[]> = {
  draft: [{ to: "sent", label: "ส่งให้ลูกค้าแล้ว", icon: Send, primary: true }],
  sent: [
    { to: "accepted", label: "ลูกค้าอนุมัติ", icon: Check, primary: true },
    { to: "rejected", label: "ไม่อนุมัติ", icon: X },
  ],
  accepted: [{ to: "sent", label: "ย้อนเป็นส่งแล้ว", icon: RotateCcw }],
  rejected: [{ to: "sent", label: "ย้อนเป็นส่งแล้ว", icon: RotateCcw }],
};

export function QuotationActions({
  id,
  status,
  order,
}: {
  id: string;
  status: QuotationStatus;
  order: { id: string; number: string } | null;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="page__actions no-print" aria-busy={pending}>
      {order ? (
        <Link href={`/orders/${order.id}`} className="btn btn--sm btn--quiet">
          <ClipboardList size={16} aria-hidden />
          ใบสั่งขาย {order.number}
          <ArrowRight size={14} aria-hidden />
        </Link>
      ) : (
        status === "accepted" && (
          <button
            type="button"
            className="btn btn--sm btn--primary"
            disabled={pending}
            onClick={() => startTransition(() => createOrderFromQuotation(id))}
          >
            <ClipboardList size={16} aria-hidden />
            เปิดใบสั่งขาย
          </button>
        )
      )}
      {transitions[status].map(({ to, label, icon: Icon, primary }) => (
        <button
          key={to}
          type="button"
          className={`btn btn--sm ${primary ? "btn--primary" : "btn--quiet"}`}
          disabled={pending}
          onClick={() => startTransition(() => setQuotationStatus(id, to))}
        >
          <Icon size={16} aria-hidden />
          {label}
        </button>
      ))}
      <button type="button" className="btn btn--sm btn--quiet" onClick={() => window.print()}>
        <Printer size={16} aria-hidden />
        พิมพ์ / PDF
      </button>
      <Link href={`/quotations/${id}/edit`} className="btn btn--sm btn--quiet">
        <Pencil size={16} aria-hidden />
        แก้ไข
      </Link>
      <button
        type="button"
        className="btn btn--sm btn--ghost"
        disabled={pending}
        onClick={() => startTransition(() => duplicateQuotation(id))}
      >
        <Copy size={16} aria-hidden />
        ทำสำเนา
      </button>
    </div>
  );
}
