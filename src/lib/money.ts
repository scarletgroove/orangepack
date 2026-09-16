import type { VatMode } from "@/db/schema";

export const VAT_BPS = 700;

const bahtFormat = new Intl.NumberFormat("th-TH", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const qtyFormat = new Intl.NumberFormat("th-TH");

export function formatBaht(satang: number) {
  return bahtFormat.format(satang / 100);
}

export function formatQty(qty: number) {
  return qtyFormat.format(qty);
}

export function satangToInput(satang: number) {
  return (satang / 100).toFixed(2);
}

export function parseBahtInput(value: string): number | null {
  const cleaned = value.replace(/[,\s฿]/g, "");
  if (cleaned === "" || !/^\d+(\.\d{0,2})?$/.test(cleaned)) return null;
  return Math.round(Number(cleaned) * 100);
}

export function parseQtyInput(value: string): number | null {
  const cleaned = value.replace(/[,\s]/g, "");
  if (!/^\d+$/.test(cleaned)) return null;
  const n = Number(cleaned);
  return n > 0 ? n : null;
}

export type Totals = {
  subtotal: number;
  discount: number;
  afterDiscount: number;
  beforeVat: number;
  vat: number;
  total: number;
};

export function computeTotals(
  lines: { quantity: number; unitPriceSatang: number }[],
  discountBps: number,
  vatMode: VatMode,
  vatBps = VAT_BPS,
): Totals {
  const subtotal = lines.reduce((sum, l) => sum + l.quantity * l.unitPriceSatang, 0);
  const discount = Math.round((subtotal * discountBps) / 10_000);
  const afterDiscount = subtotal - discount;
  let vat = 0;
  let beforeVat = afterDiscount;
  let total = afterDiscount;
  if (vatMode === "exclusive") {
    vat = Math.round((afterDiscount * vatBps) / 10_000);
    total = afterDiscount + vat;
  } else if (vatMode === "inclusive") {
    vat = Math.round((afterDiscount * vatBps) / (10_000 + vatBps));
    beforeVat = afterDiscount - vat;
  }
  return { subtotal, discount, afterDiscount, beforeVat, vat, total };
}

const DIGITS = ["ศูนย์", "หนึ่ง", "สอง", "สาม", "สี่", "ห้า", "หก", "เจ็ด", "แปด", "เก้า"];
const PLACES = ["", "สิบ", "ร้อย", "พัน", "หมื่น", "แสน"];

function readBelowMillion(n: number, hasHigherPart: boolean) {
  const s = String(n);
  let out = "";
  for (let i = 0; i < s.length; i++) {
    const d = Number(s[i]);
    const place = s.length - i - 1;
    if (d === 0) continue;
    if (place === 1 && d === 1) out += "สิบ";
    else if (place === 1 && d === 2) out += "ยี่สิบ";
    else if (place === 0 && d === 1 && (s.length > 1 || hasHigherPart)) out += "เอ็ด";
    else out += DIGITS[d] + PLACES[place];
  }
  return out;
}

function readNumber(n: number): string {
  if (n === 0) return DIGITS[0];
  const millions = Math.floor(n / 1_000_000);
  const rest = n % 1_000_000;
  let out = millions > 0 ? readNumber(millions) + "ล้าน" : "";
  if (rest > 0) out += readBelowMillion(rest, millions > 0);
  return out;
}

/** Thai amount-in-words line required on Thai commercial documents, e.g. "หนึ่งพันบาทถ้วน". */
export function bahtText(satang: number) {
  const baht = Math.floor(satang / 100);
  const st = satang % 100;
  if (baht === 0 && st === 0) return "ศูนย์บาทถ้วน";
  const bahtPart = baht > 0 ? readNumber(baht) + "บาท" : "";
  return st === 0 ? bahtPart + "ถ้วน" : bahtPart + readNumber(st) + "สตางค์";
}
