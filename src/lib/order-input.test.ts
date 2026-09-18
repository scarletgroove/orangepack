import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DEFAULT_DEPOSIT_BPS, isItemsEditable, orderDetailsInput, orderItemsInput } from "./order-input";

const id = "11111111-1111-4111-8111-111111111111";
const details = (over: Partial<Record<string, string>> = {}) => ({
  id,
  dueDate: "2026-10-01",
  depositPercent: "50",
  paidBaht: "40,125.00",
  notes: "ด่วน",
  ...over,
});

describe("orderDetailsInput", () => {
  it("converts what the form sends into what the database stores", () => {
    assert.deepEqual(orderDetailsInput.parse(details()), {
      id,
      dueDate: "2026-10-01",
      depositBps: 5000,
      paidSatang: 4_012_500,
      notes: "ด่วน",
    });
  });

  it("treats an empty due date as not yet agreed and empty payment as zero", () => {
    const parsed = orderDetailsInput.parse(details({ dueDate: "", paidBaht: "" }));
    assert.equal(parsed.dueDate, null);
    assert.equal(parsed.paidSatang, 0);
  });

  it("keeps a fractional deposit exact in basis points", () => {
    assert.equal(orderDetailsInput.parse(details({ depositPercent: "33.33" })).depositBps, 3333);
  });

  it("rejects input that would corrupt the order", () => {
    for (const [field, value] of [
      ["depositPercent", "101"],
      ["depositPercent", "abc"],
      ["depositPercent", ""],
      ["paidBaht", "-5"],
      ["paidBaht", "1.005"],
      ["dueDate", "31/10/2026"],
    ] as const) {
      assert.equal(orderDetailsInput.safeParse(details({ [field]: value })).success, false, `${field}=${value}`);
    }
  });
});

describe("orderItemsInput", () => {
  it("accepts a corrected quantity and price", () => {
    const parsed = orderItemsInput.parse({ id, items: [{ id: 1, quantity: 5000, unitPriceSatang: 750 }] });
    assert.equal(parsed.items[0].quantity, 5000);
  });

  it("refuses to empty an order or to take a quantity of zero", () => {
    assert.equal(orderItemsInput.safeParse({ id, items: [] }).success, false);
    assert.equal(
      orderItemsInput.safeParse({ id, items: [{ id: 1, quantity: 0, unitPriceSatang: 750 }] }).success,
      false,
    );
  });

  it("allows a free line at no charge but not a negative price", () => {
    assert.equal(
      orderItemsInput.safeParse({ id, items: [{ id: 1, quantity: 1, unitPriceSatang: 0 }] }).success,
      true,
    );
    assert.equal(
      orderItemsInput.safeParse({ id, items: [{ id: 1, quantity: 1, unitPriceSatang: -1 }] }).success,
      false,
    );
  });
});

describe("order editing rules", () => {
  it("allows line edits only before production starts", () => {
    assert.equal(isItemsEditable("awaiting_production"), true);
    for (const status of ["in_production", "ready", "delivered", "cancelled"] as const) {
      assert.equal(isItemsEditable(status), false, status);
    }
  });

  it("asks half up front by default", () => {
    assert.equal(DEFAULT_DEPOSIT_BPS, 5000);
  });
});
