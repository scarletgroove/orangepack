import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  bahtText,
  computeTotals,
  formatBaht,
  parseBahtInput,
  parseQtyInput,
  satangToInput,
  VAT_BPS,
} from "./money";

const line = (quantity: number, unitPriceSatang: number) => ({ quantity, unitPriceSatang });

describe("computeTotals", () => {
  it("adds 7% VAT on top, because catalog prices exclude it", () => {
    assert.equal(VAT_BPS, 700);
    assert.deepEqual(computeTotals([line(2000, 750)], 0, "exclusive"), {
      subtotal: 1_500_000,
      discount: 0,
      afterDiscount: 1_500_000,
      vat: 105_000,
      total: 1_605_000,
    });
  });

  it("charges no VAT when the order is set to none", () => {
    const totals = computeTotals([line(2000, 750)], 0, "none");
    assert.equal(totals.vat, 0);
    assert.equal(totals.total, 1_500_000);
  });

  it("applies the discount before VAT", () => {
    const totals = computeTotals([line(5000, 1500)], 800, "exclusive");
    assert.equal(totals.discount, 600_000);
    assert.equal(totals.afterDiscount, 6_900_000);
    assert.equal(totals.vat, 483_000);
    assert.equal(totals.total, 7_383_000);
  });

  it("sums several lines", () => {
    const totals = computeTotals([line(3, 333), line(7, 111)], 0, "none");
    assert.equal(totals.subtotal, 999 + 777);
  });

  it("rounds discount and VAT to whole satang", () => {
    const totals = computeTotals([line(1, 333)], 333, "exclusive");
    assert.equal(totals.discount, Math.round(333 * 0.0333));
    assert.equal(totals.vat, Math.round((333 - totals.discount) * 0.07));
    assert.ok(Number.isInteger(totals.total));
  });

  it("treats an empty order as zero rather than failing", () => {
    assert.deepEqual(computeTotals([], 800, "exclusive"), {
      subtotal: 0,
      discount: 0,
      afterDiscount: 0,
      vat: 0,
      total: 0,
    });
  });
});

describe("money input parsing", () => {
  it("accepts baht written the way staff type it", () => {
    assert.equal(parseBahtInput("40,125.00"), 4_012_500);
    assert.equal(parseBahtInput(" ฿7.50 "), 750);
    assert.equal(parseBahtInput("0"), 0);
  });

  it("rejects anything that is not a plain amount", () => {
    for (const bad of ["", "abc", "-5", "7.505", "1,2.3.4"]) {
      assert.equal(parseBahtInput(bad), null, bad);
    }
  });

  it("accepts whole quantities only", () => {
    assert.equal(parseQtyInput("2,000"), 2000);
    for (const bad of ["0", "-1", "1.5", ""]) assert.equal(parseQtyInput(bad), null, bad);
  });

  it("round-trips satang through the editor input format", () => {
    for (const satang of [0, 750, 4_012_500]) {
      assert.equal(parseBahtInput(satangToInput(satang)), satang);
    }
  });

  it("formats with two decimals and thousands separators", () => {
    assert.equal(formatBaht(1_605_000), "16,050.00");
    assert.equal(formatBaht(750), "7.50");
  });
});

describe("bahtText", () => {
  it("writes the amount in words for the document footer", () => {
    assert.equal(bahtText(0), "ศูนย์บาทถ้วน");
    assert.equal(bahtText(100_000), "หนึ่งพันบาทถ้วน");
    assert.equal(bahtText(1_605_000), "หนึ่งหมื่นหกพันห้าสิบบาทถ้วน");
  });

  it("uses เอ็ด and ยี่สิบ where Thai requires them", () => {
    assert.equal(bahtText(1_100), "สิบเอ็ดบาทถ้วน");
    assert.equal(bahtText(2_100), "ยี่สิบเอ็ดบาทถ้วน");
  });

  it("reads millions and satang", () => {
    assert.equal(bahtText(100_000_000), "หนึ่งล้านบาทถ้วน");
    assert.equal(bahtText(50), "ห้าสิบสตางค์");
    assert.equal(bahtText(150), "หนึ่งบาทห้าสิบสตางค์");
  });
});
