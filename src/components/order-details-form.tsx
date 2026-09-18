"use client";

import { AlertCircle, Save } from "lucide-react";
import { useActionState, useId, useState } from "react";
import { updateOrderDetails } from "@/app/(app)/orders/actions";
import type { SalesOrderWithItems } from "@/lib/data";
import { formatBaht, parseBahtInput, satangToInput } from "@/lib/money";
import { depositOf } from "@/lib/order-math";
import type { SaveState } from "@/lib/quotation-input";

export function OrderDetailsForm({ order }: { order: SalesOrderWithItems }) {
  const uid = useId();
  const [state, formAction, pending] = useActionState<SaveState, FormData>(updateOrderDetails, null);
  const [depositPercent, setDepositPercent] = useState(String(order.depositBps / 100));
  const [paidBaht, setPaidBaht] = useState(satangToInput(order.paidSatang));

  const percent = Number(depositPercent);
  const depositSatang =
    /^\d{1,3}(\.\d{1,2})?$/.test(depositPercent.trim()) && percent <= 100
      ? depositOf(order.totalSatang, Math.round(percent * 100))
      : null;
  const paidSatang = paidBaht.trim() === "" ? 0 : parseBahtInput(paidBaht);
  const outstanding = paidSatang === null ? null : order.totalSatang - paidSatang;

  return (
    <form action={formAction} className="order-panel no-print">
      <input type="hidden" name="id" value={order.id} />

      <div className="grid-fields">
        <div className="field">
          <label className="field__label" htmlFor={`${uid}-due`}>
            กำหนดส่ง
          </label>
          <input
            id={`${uid}-due`}
            name="dueDate"
            type="date"
            className="input"
            defaultValue={order.dueDate ?? ""}
            min={order.orderDate}
          />
          <p className="field__help">เว้นว่างได้ถ้ายังไม่ตกลงวันส่ง</p>
        </div>

        <div className="field">
          <label className="field__label" htmlFor={`${uid}-deposit`}>
            มัดจำ (%)
          </label>
          <input
            id={`${uid}-deposit`}
            name="depositPercent"
            className="input num"
            inputMode="decimal"
            value={depositPercent}
            onChange={(e) => setDepositPercent(e.target.value)}
            aria-invalid={depositSatang === null ? true : undefined}
          />
          <p className={`field__help${depositSatang === null ? " is-error" : ""}`}>
            {depositSatang === null ? "ใส่ตัวเลข 0–100" : `เท่ากับ ฿${formatBaht(depositSatang)}`}
          </p>
        </div>

        <div className="field">
          <label className="field__label" htmlFor={`${uid}-paid`}>
            ชำระแล้ว (บาท)
          </label>
          <input
            id={`${uid}-paid`}
            name="paidBaht"
            className="input num"
            inputMode="decimal"
            value={paidBaht}
            onChange={(e) => setPaidBaht(e.target.value)}
            aria-invalid={paidSatang === null ? true : undefined}
          />
          <p className={`field__help${paidSatang === null || (outstanding ?? 0) < 0 ? " is-error" : ""}`}>
            {paidSatang === null
              ? "ใส่จำนวนเงิน เช่น 40125.00"
              : outstanding === null || outstanding < 0
                ? "ยอดชำระมากกว่ายอดรวม"
                : outstanding === 0
                  ? "ชำระครบแล้ว"
                  : `ค้างชำระ ฿${formatBaht(outstanding)}`}
          </p>
        </div>

        <div className="field span-2">
          <label className="field__label" htmlFor={`${uid}-notes`}>
            หมายเหตุการผลิต
          </label>
          <textarea
            id={`${uid}-notes`}
            name="notes"
            className="textarea"
            rows={3}
            defaultValue={order.notes ?? ""}
            placeholder="เช่น สีพิมพ์ ไฟล์อาร์ตเวิร์ก ที่อยู่จัดส่ง"
          />
          <p className="field__help" />
        </div>
      </div>

      {state && !state.ok && (
        <div className="alert" role="alert">
          <AlertCircle size={18} aria-hidden />
          <span>{state.message}</span>
        </div>
      )}

      <button type="submit" className="btn btn--primary btn--sm" disabled={pending}>
        {pending ? <span className="spinner" aria-hidden /> : <Save size={16} aria-hidden />}
        บันทึกการผลิตและการเงิน
      </button>
    </form>
  );
}
