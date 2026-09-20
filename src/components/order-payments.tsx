"use client";

import { AlertCircle, Plus, Trash2 } from "lucide-react";
import { useActionState, useId, useState, useTransition } from "react";
import { addOrderPayment, deleteOrderPayment } from "@/app/(app)/orders/actions";
import type { PaymentMethod } from "@/db/schema";
import type { SalesOrderWithItems } from "@/lib/data";
import { formatThaiDateShort } from "@/lib/dates";
import { formatBaht, satangToInput } from "@/lib/money";
import { depositOf, outstandingOf, overpaidOf, paidTotalOf } from "@/lib/order-math";
import type { SaveState } from "@/lib/quotation-input";

export const METHOD_LABEL: Record<PaymentMethod, string> = {
  transfer: "โอนเงิน",
  cash: "เงินสด",
  cheque: "เช็ค",
  card: "บัตร",
  other: "อื่น ๆ",
};

export function OrderPayments({ order, today }: { order: SalesOrderWithItems; today: string }) {
  const uid = useId();
  const [state, formAction, pending] = useActionState<SaveState, FormData>(addOrderPayment, null);
  const [removing, startRemoving] = useTransition();

  const paid = paidTotalOf(order.payments);
  const outstanding = outstandingOf(order.totalSatang, paid);
  const overpaid = overpaidOf(order.totalSatang, paid);
  const deposit = depositOf(order.totalSatang, order.depositBps);
  // The next amount staff will usually enter: the deposit if it has not come in, otherwise the balance.
  const suggested = paid === 0 && deposit > 0 ? deposit : outstanding;
  const [amount, setAmount] = useState(suggested > 0 ? satangToInput(suggested) : "");

  return (
    <div className="order-panel no-print">
      <dl className="pay-summary">
        <div>
          <dt>ยอดรวม</dt>
          <dd className="num">฿{formatBaht(order.totalSatang)}</dd>
        </div>
        <div>
          <dt>มัดจำ {order.depositBps / 100}%</dt>
          <dd className="num">฿{formatBaht(deposit)}</dd>
        </div>
        <div>
          <dt>ชำระแล้ว</dt>
          <dd className="num">฿{formatBaht(paid)}</dd>
        </div>
        <div className={outstanding > 0 ? "is-due" : ""}>
          <dt>{overpaid > 0 ? "ชำระเกิน" : outstanding > 0 ? "ค้างชำระ" : "ชำระครบแล้ว"}</dt>
          <dd className="num">฿{formatBaht(overpaid > 0 ? overpaid : outstanding)}</dd>
        </div>
      </dl>

      {order.payments.length > 0 && (
        <table className="pay-table">
          <thead>
            <tr>
              <th scope="col">วันที่รับ</th>
              <th scope="col">ช่องทาง</th>
              <th scope="col">อ้างอิง</th>
              <th scope="col" className="is-right">
                จำนวนเงิน
              </th>
              <th scope="col">
                <span className="sr-only">ลบ</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {order.payments.map((payment) => (
              <tr key={payment.id}>
                <td className="num">{formatThaiDateShort(payment.paidOn)}</td>
                <td>{METHOD_LABEL[payment.method]}</td>
                <td>
                  {payment.reference || "—"}
                  {payment.note && <span className="register__sub">{payment.note}</span>}
                </td>
                <td className="is-right num">{formatBaht(payment.amountSatang)}</td>
                <td className="is-right">
                  <button
                    type="button"
                    className="btn btn--icon btn--ghost"
                    disabled={removing}
                    onClick={() => startRemoving(() => deleteOrderPayment(order.id, payment.id))}
                    aria-label={`ลบการชำระเงิน ${formatBaht(payment.amountSatang)} บาท`}
                  >
                    <Trash2 size={16} aria-hidden />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <form action={formAction} className="pay-form">
        <input type="hidden" name="orderId" value={order.id} />

        <div className="field">
          <label className="field__label" htmlFor={`${uid}-date`}>
            วันที่รับเงิน
          </label>
          <input id={`${uid}-date`} name="paidOn" type="date" className="input" defaultValue={today} required />
        </div>

        <div className="field">
          <label className="field__label" htmlFor={`${uid}-amount`}>
            จำนวนเงิน (บาท)
          </label>
          <input
            id={`${uid}-amount`}
            name="amountBaht"
            className="input num"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
        </div>

        <div className="field">
          <label className="field__label" htmlFor={`${uid}-method`}>
            ช่องทาง
          </label>
          <select id={`${uid}-method`} name="method" className="select" defaultValue="transfer">
            {(Object.keys(METHOD_LABEL) as PaymentMethod[]).map((method) => (
              <option key={method} value={method}>
                {METHOD_LABEL[method]}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label className="field__label" htmlFor={`${uid}-ref`}>
            เลขที่อ้างอิง / สลิป
          </label>
          <input id={`${uid}-ref`} name="reference" className="input" placeholder="ไม่บังคับ" />
        </div>

        <div className="field">
          <label className="field__label" htmlFor={`${uid}-note`}>
            หมายเหตุ
          </label>
          <input id={`${uid}-note`} name="note" className="input" placeholder="ไม่บังคับ" />
        </div>

        <button type="submit" className="btn btn--primary btn--sm" disabled={pending}>
          {pending ? <span className="spinner" aria-hidden /> : <Plus size={16} aria-hidden />}
          บันทึกการชำระเงิน
        </button>
      </form>

      {state && !state.ok && (
        <div className="alert" role="alert">
          <AlertCircle size={18} aria-hidden />
          <span>{state.message}</span>
        </div>
      )}
    </div>
  );
}
