"use client";

import { Check, Copy, Pencil, Printer, RotateCcw, Send, X } from "lucide-react";
import Link from "next/link";
import { useTransition } from "react";
import { duplicateQuotation, setQuotationStatus } from "@/app/quotations/actions";
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

export function QuotationActions({ id, status }: { id: string; status: QuotationStatus }) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="page__actions no-print" aria-busy={pending}>
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
