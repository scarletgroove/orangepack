import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { depositOf, outstandingOf, recomputeOrderMoney, type OrderPricing } from "./order-math";

const base: OrderPricing = {
  discountBps: 0,
  vatMode: "exclusive",
  vatBps: 700,
  depositBps: 5000,
  paidSatang: 0,
};
const lines = (quantity: number, unitPriceSatang = 750) => [{ quantity, unitPriceSatang }];

describe("recomputeOrderMoney", () => {
  it("derives every figure on the order from its lines", () => {
    assert.deepEqual(recomputeOrderMoney(lines(2000), { ...base, paidSatang: 802_500 }), {
      subtotalSatang: 1_500_000,
      discountSatang: 0,
      vatSatang: 105_000,
      totalSatang: 1_605_000,
      depositSatang: 802_500,
      paidSatang: 802_500,
      outstandingSatang: 802_500,
    });
  });

  it("moves the deposit and the balance when the quantity changes", () => {
    const after = recomputeOrderMoney(lines(3000), { ...base, paidSatang: 802_500 });
    assert.equal(after.totalSatang, 2_407_500);
    assert.equal(after.depositSatang, 1_203_750);
    assert.equal(after.outstandingSatang, 1_605_000);
  });

  it("gives the same answer however many times the order is saved", () => {
    // Editing 2000 → 3000 → 500 → 3000 must land where saving 3000 once lands.
    const once = recomputeOrderMoney(lines(3000), base);
    let paidSatang = base.paidSatang;
    for (const quantity of [3000, 500, 3000]) {
      paidSatang = recomputeOrderMoney(lines(quantity), { ...base, paidSatang }).paidSatang;
    }
    assert.deepEqual(recomputeOrderMoney(lines(3000), { ...base, paidSatang }), once);
  });

  it("never reports a negative balance when the quantity is cut below what was paid", () => {
    const cut = recomputeOrderMoney(lines(500), { ...base, paidSatang: 802_500 });
    assert.equal(cut.totalSatang, 401_250);
    assert.equal(cut.paidSatang, 401_250, "payment received follows the total down");
    assert.equal(cut.outstandingSatang, 0);
  });

  it("keeps paid, deposit and balance consistent across a run of edits", () => {
    let paidSatang = 802_500;
    for (const quantity of [100, 9000, 250, 4321, 1, 7777]) {
      const money = recomputeOrderMoney(lines(quantity), { ...base, paidSatang });
      assert.equal(money.totalSatang, Math.round(quantity * 750 * 1.07), `total at ${quantity}`);
      assert.equal(money.outstandingSatang, money.totalSatang - money.paidSatang);
      assert.ok(money.paidSatang <= money.totalSatang);
      assert.ok(money.outstandingSatang >= 0);
      paidSatang = money.paidSatang;
    }
  });

  it("applies the discount before VAT and takes the deposit from the final total", () => {
    const money = recomputeOrderMoney([{ quantity: 5000, unitPriceSatang: 1500 }], {
      ...base,
      discountBps: 800,
      depositBps: 3000,
    });
    assert.equal(money.discountSatang, 600_000);
    assert.equal(money.totalSatang, 7_383_000);
    assert.equal(money.depositSatang, 2_214_900);
  });
});

describe("depositOf / outstandingOf", () => {
  it("takes the deposit as a share of the total", () => {
    assert.equal(depositOf(1_605_000, 5000), 802_500);
    assert.equal(depositOf(1_605_000, 0), 0);
    assert.equal(depositOf(333, 3333), Math.round(333 * 0.3333));
  });

  it("clamps an overpayment to zero owing", () => {
    assert.equal(outstandingOf(1000, 400), 600);
    assert.equal(outstandingOf(1000, 2500), 0);
  });
});
