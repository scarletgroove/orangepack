import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DUE_SOON_DAYS, jobUrgency, urgencyLabel } from "./jobs";

const today = "2026-09-18";

describe("jobUrgency", () => {
  it("counts a passed due date as overdue, in days late", () => {
    const urgency = jobUrgency("in_production", "2026-09-15", today);
    assert.deepEqual(urgency, { kind: "overdue", days: -3 });
    assert.equal(urgencyLabel(urgency), "เลยกำหนด 3 วัน");
  });

  it("treats today as due, not late", () => {
    const urgency = jobUrgency("awaiting_production", today, today);
    assert.deepEqual(urgency, { kind: "due-soon", days: 0 });
    assert.equal(urgencyLabel(urgency), "ครบกำหนดวันนี้");
  });

  it("marks the next week as due soon and anything later as scheduled", () => {
    assert.equal(jobUrgency("ready", "2026-09-25", today).kind, "due-soon", `${DUE_SOON_DAYS} days out`);
    assert.equal(jobUrgency("ready", "2026-09-26", today).kind, "scheduled");
  });

  it("separates jobs with no promised date from late ones", () => {
    assert.deepEqual(jobUrgency("awaiting_production", null, today), { kind: "unscheduled", days: null });
  });

  it("leaves delivered and cancelled orders off the floor, however old their due date", () => {
    for (const status of ["delivered", "cancelled"] as const) {
      assert.deepEqual(jobUrgency(status, "2026-01-01", today), { kind: "closed", days: null }, status);
      assert.equal(urgencyLabel(jobUrgency(status, "2026-01-01", today)), "");
    }
  });

  it("takes a custom window when the shop wants a different horizon", () => {
    assert.equal(jobUrgency("in_production", "2026-09-21", today, 2).kind, "scheduled");
    assert.equal(jobUrgency("in_production", "2026-09-20", today, 2).kind, "due-soon");
  });
});
