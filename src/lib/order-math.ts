import type { VatMode } from "@/db/schema";
import { computeTotals } from "@/lib/money";

/** Deposit asked for, as a share of the order total. Moves with the total when the order is edited. */
export function depositOf(totalSatang: number, depositBps: number) {
  return Math.round((totalSatang * depositBps) / 10_000);
}

/** What the customer still owes. Never negative: an overpayment is settled outside the app. */
export function outstandingOf(totalSatang: number, paidSatang: number) {
  return Math.max(totalSatang - paidSatang, 0);
}

export type OrderPricing = {
  discountBps: number;
  vatMode: VatMode;
  vatBps: number;
  depositBps: number;
  paidSatang: number;
};

export type OrderMoney = {
  subtotalSatang: number;
  discountSatang: number;
  vatSatang: number;
  totalSatang: number;
  depositSatang: number;
  paidSatang: number;
  outstandingSatang: number;
};

/**
 * Every money figure on a sales order, derived from its current lines. Run on each save of the items, so
 * editing a quantity repeatedly lands on the same answer as editing it once — the result depends only on
 * the lines, never on what the previous save left behind.
 */
export function recomputeOrderMoney(
  lines: { quantity: number; unitPriceSatang: number }[],
  pricing: OrderPricing,
): OrderMoney {
  const totals = computeTotals(lines, pricing.discountBps, pricing.vatMode, pricing.vatBps);
  // Money already received cannot exceed a total that has just been cut: leaving paid above the total
  // would show a negative balance and then block every later save of the payment form.
  const paidSatang = Math.min(pricing.paidSatang, totals.total);
  return {
    subtotalSatang: totals.subtotal,
    discountSatang: totals.discount,
    vatSatang: totals.vat,
    totalSatang: totals.total,
    depositSatang: depositOf(totals.total, pricing.depositBps),
    paidSatang,
    outstandingSatang: outstandingOf(totals.total, paidSatang),
  };
}
