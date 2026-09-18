import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { addDays, daysBetween, formatThaiDate, formatThaiDateShort, todayInBangkok } from "./dates";

describe("date helpers", () => {
  it("counts days across months and leap years", () => {
    assert.equal(addDays("2026-09-30", 1), "2026-10-01");
    assert.equal(addDays("2026-12-31", 30), "2027-01-30");
    assert.equal(addDays("2028-02-28", 1), "2028-02-29");
    assert.equal(daysBetween("2026-09-18", "2026-10-18"), 30);
    assert.equal(daysBetween("2026-10-18", "2026-09-18"), -30);
  });

  it("keeps a quotation's validity window when it is duplicated", () => {
    const issue = "2026-09-18";
    const validUntil = addDays(issue, 30);
    assert.equal(daysBetween(issue, validUntil), 30);
  });

  it("reads dates in Thai with the Buddhist year", () => {
    assert.equal(formatThaiDate("2026-09-18"), "18 กันยายน 2569");
    assert.equal(formatThaiDateShort("2026-09-18"), "18 ก.ย. 2569");
  });

  it("gives today in Bangkok as a plain ISO date", () => {
    assert.match(todayInBangkok(), /^\d{4}-\d{2}-\d{2}$/);
  });
});
