"use client";

import { AlertCircle, Save, Trash2, Undo2 } from "lucide-react";
import { useActionState, useState } from "react";
import { updateOrderItems } from "@/app/(app)/orders/actions";
import type { SalesOrderWithItems } from "@/lib/data";
import { formatBaht, parseBahtInput, parseQtyInput, satangToInput } from "@/lib/money";
import { recomputeOrderMoney } from "@/lib/order-math";
import type { SaveState } from "@/lib/quotation-input";

type Row = {
  id: number;
  description: string;
  variantLabel: string | null;
  unit: string;
  qtyInput: string;
  priceInput: string;
};

function toRows(items: SalesOrderWithItems["items"]): Row[] {
  return items.map((item) => ({
    id: item.id,
    description: item.description,
    variantLabel: item.variantLabel,
    unit: item.unit,
    qtyInput: String(item.quantity),
    priceInput: satangToInput(item.unitPriceSatang),
  }));
}

/** Quantity and price only: adding products means going back to the quotation and issuing a new order. */
export function OrderItemsEditor({ order }: { order: SalesOrderWithItems }) {
  const [state, formAction, pending] = useActionState<SaveState, FormData>(updateOrderItems, null);
  const [rows, setRows] = useState<Row[]>(() => toRows(order.items));
  const [removed, setRemoved] = useState<{ row: Row; index: number } | null>(null);

  const parsed = rows.map((row) => ({
    id: row.id,
    quantity: parseQtyInput(row.qtyInput),
    unitPriceSatang: parseBahtInput(row.priceInput),
  }));
  const valid = parsed.every((line) => line.quantity !== null && line.unitPriceSatang !== null);
  const lines = parsed.map((line) => ({
    quantity: line.quantity ?? 0,
    unitPriceSatang: line.unitPriceSatang ?? 0,
  }));
  const money = recomputeOrderMoney(lines, order);
  const fingerprint = (entries: [number, string, string][]) => JSON.stringify(entries);
  const changed =
    fingerprint(rows.map((row) => [row.id, row.qtyInput.trim(), row.priceInput.trim()])) !==
    fingerprint(order.items.map((item) => [item.id, String(item.quantity), satangToInput(item.unitPriceSatang)]));

  const update = (id: number, patch: Partial<Row>) =>
    setRows((current) => current.map((row) => (row.id === id ? { ...row, ...patch } : row)));

  const remove = (id: number) =>
    setRows((current) => {
      const index = current.findIndex((row) => row.id === id);
      if (index === -1) return current;
      setRemoved({ row: current[index], index });
      return current.filter((row) => row.id !== id);
    });

  const undoRemove = () => {
    if (!removed) return;
    setRows((current) => {
      const next = [...current];
      next.splice(removed.index, 0, removed.row);
      return next;
    });
    setRemoved(null);
  };

  return (
    <form action={formAction} className="no-print">
      <input
        type="hidden"
        name="payload"
        value={JSON.stringify({
          id: order.id,
          items: parsed.map((line) => ({
            id: line.id,
            quantity: line.quantity ?? 0,
            unitPriceSatang: line.unitPriceSatang ?? 0,
          })),
        })}
      />

      {state && !state.ok && (
        <div className="alert" role="alert">
          <AlertCircle size={18} aria-hidden />
          <span>{state.message}</span>
        </div>
      )}

      <div className="order-lines">
        {rows.map((row) => {
          const quantity = parseQtyInput(row.qtyInput);
          const price = parseBahtInput(row.priceInput);
          return (
            <div key={row.id} className="order-line">
              <div className="order-line__name">
                <span>{row.description}</span>
                {row.variantLabel && <span className="order-line__variant">{row.variantLabel}</span>}
              </div>
              <div className="field">
                <label className="field__label" htmlFor={`qty-${row.id}`}>
                  จำนวน ({row.unit})
                </label>
                <input
                  id={`qty-${row.id}`}
                  className="input num"
                  inputMode="numeric"
                  value={row.qtyInput}
                  onChange={(e) => update(row.id, { qtyInput: e.target.value })}
                  aria-invalid={quantity === null ? true : undefined}
                />
              </div>
              <div className="field">
                <label className="field__label" htmlFor={`price-${row.id}`}>
                  ราคา/หน่วย
                </label>
                <input
                  id={`price-${row.id}`}
                  className="input num"
                  inputMode="decimal"
                  value={row.priceInput}
                  onChange={(e) => update(row.id, { priceInput: e.target.value })}
                  aria-invalid={price === null ? true : undefined}
                />
              </div>
              <p className="order-line__total num">
                {quantity !== null && price !== null ? `฿${formatBaht(quantity * price)}` : "—"}
              </p>
              <button
                type="button"
                className="btn btn--icon btn--ghost"
                onClick={() => remove(row.id)}
                disabled={rows.length === 1}
                aria-label={`ลบรายการ ${row.description}`}
                title={rows.length === 1 ? "ต้องมีอย่างน้อย 1 รายการ" : "ลบรายการ"}
              >
                <Trash2 size={16} aria-hidden />
              </button>
            </div>
          );
        })}
      </div>

      {removed && (
        <button type="button" className="btn btn--sm btn--ghost" onClick={undoRemove}>
          <Undo2 size={16} aria-hidden />
          เอา “{removed.row.description}” กลับคืน
        </button>
      )}

      <div className="order-lines__foot">
        <p className="num">
          ยอดรวมใหม่ <strong>฿{formatBaht(money.totalSatang)}</strong>
          {order.vatMode === "exclusive" && <span className="order-lines__vat"> (รวม VAT 7% แล้ว)</span>}
          <span className="order-lines__vat">
            {" "}
            · มัดจำ {order.depositBps / 100}% ฿{formatBaht(money.depositSatang)} · ค้างชำระ ฿
            {formatBaht(money.outstandingSatang)}
          </span>
        </p>
        <button type="submit" className="btn btn--primary btn--sm" disabled={pending || !valid || !changed}>
          {pending ? <span className="spinner" aria-hidden /> : <Save size={16} aria-hidden />}
          บันทึกรายการ
        </button>
      </div>
    </form>
  );
}
