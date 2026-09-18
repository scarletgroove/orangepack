import type { SalesOrderStatus } from "@/db/schema";
import { daysBetween } from "@/lib/dates";

/** Orders still needing work. Delivered and cancelled ones are off the floor. */
export const OPEN_JOB_STATUSES = ["awaiting_production", "in_production", "ready"] as const;

export type JobUrgency =
  | { kind: "overdue"; days: number }
  | { kind: "due-soon"; days: number }
  | { kind: "scheduled"; days: number }
  | { kind: "unscheduled"; days: null }
  | { kind: "closed"; days: null };

export const DUE_SOON_DAYS = 7;

/**
 * How urgently a job needs attention, from its promised date. `days` counts from today:
 * negative is days late, 0 is due today, positive is days remaining.
 */
export function jobUrgency(
  status: SalesOrderStatus,
  dueDate: string | null,
  today: string,
  soonDays = DUE_SOON_DAYS,
): JobUrgency {
  if (status === "delivered" || status === "cancelled") return { kind: "closed", days: null };
  if (!dueDate) return { kind: "unscheduled", days: null };
  const days = daysBetween(today, dueDate);
  if (days < 0) return { kind: "overdue", days };
  if (days <= soonDays) return { kind: "due-soon", days };
  return { kind: "scheduled", days };
}

/** Thai wording for the countdown shown next to a due date. */
export function urgencyLabel(urgency: JobUrgency) {
  switch (urgency.kind) {
    case "overdue":
      return `เลยกำหนด ${Math.abs(urgency.days)} วัน`;
    case "due-soon":
      return urgency.days === 0 ? "ครบกำหนดวันนี้" : `อีก ${urgency.days} วัน`;
    case "scheduled":
      return `อีก ${urgency.days} วัน`;
    case "unscheduled":
      return "ยังไม่กำหนดวันส่ง";
    case "closed":
      return "";
  }
}
