import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DEFAULT_DEPOSIT_BPS, isItemsEditable, orderDetailsInput, orderItemsInput, paymentInput } from "./order-input";

const id = "11111111-1111-4111-8111-111111111111";
const details = (over: Partial<Record<string, string>> = {}) => ({
  id,
  dueDate: "2026-10-01",
  depositPercent: "50",
  notes: "ด่วน",
  ...over,
});

describe("orderDetailsInput", () => {
  it("converts what the form sends into what the database stores", () => {
    assert.deepEqual(orderDetailsInput.parse(details()), {
      id,
      dueDate: "2026-10-01",
      depositBps: 5000,
      notes: "ด่วน",
    });
  });

  it("treats an empty due date as not yet agreed", () => {
    assert.equal(orderDetailsInput.parse(details({ dueDate: "" })).dueDate, null);
  });

  it("keeps a fractional deposit exact in basis points", () => {
    assert.equal(orderDetailsInput.parse(details({ depositPercent: "33.33" })).depositBps, 3333);
  });

  it("rejects input that would corrupt the order", () => {
    for (const [field, value] of [
      ["depositPercent", "101"],
      ["depositPercent", "abc"],
      ["depositPercent", ""],
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

describe("paymentInput", () => {
  const payment = (over: Partial<Record<string, string>> = {}) => ({
    orderId: id,
    paidOn: "2026-09-18",
    amountBaht: "8,025.00",
    method: "transfer",
    reference: "SLIP-001",
    note: "",
    ...over,
  });

  it("records an amount received with its date, method and reference", () => {
    assert.deepEqual(paymentInput.parse(payment()), {
      orderId: id,
      paidOn: "2026-09-18",
      amountSatang: 802_500,
      method: "transfer",
      reference: "SLIP-001",
      note: null,
    });
  });

  it("leaves optional fields null rather than empty strings", () => {
    const parsed = paymentInput.parse(payment({ reference: "", note: "  " }));
    assert.equal(parsed.reference, null);
    assert.equal(parsed.note, null);
  });

  it("rejects a payment that records nothing or cannot have happened", () => {
    for (const bad of [
      payment({ amountBaht: "0" }),
      payment({ amountBaht: "" }),
      payment({ amountBaht: "-100" }),
      payment({ paidOn: "" }),
      payment({ method: "bitcoin" }),
    ]) {
      assert.equal(paymentInput.safeParse(bad).success, false, JSON.stringify(bad));
    }
  });

  it("accepts every method the shop actually uses", () => {
    for (const method of ["transfer", "cash", "cheque", "card", "other"]) {
      assert.equal(paymentInput.safeParse(payment({ method })).success, true, method);
    }
  });
});
