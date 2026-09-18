import type { SalesOrderStatus } from "@/db/schema";

export const ORDER_STATUS_LABEL: Record<SalesOrderStatus, string> = {
  awaiting_production: "รอผลิต",
  in_production: "กำลังผลิต",
  ready: "ผลิตเสร็จ",
  delivered: "ส่งแล้ว",
  cancelled: "ยกเลิก",
};

/** An order past its promised date, while it still has work left, is the one thing staff must not miss. */
export function isOverdue(status: SalesOrderStatus, dueDate: string | null, today: string) {
  if (!dueDate || status === "delivered" || status === "cancelled") return false;
  return dueDate < today;
}

export function OrderStatusChip({
  status,
  dueDate,
  today,
}: {
  status: SalesOrderStatus;
  dueDate: string | null;
  today: string;
}) {
  if (isOverdue(status, dueDate, today)) {
    return <span className="chip chip--expired">เลยกำหนดส่ง</span>;
  }
  return <span className={`chip chip--${status}`}>{ORDER_STATUS_LABEL[status]}</span>;
}
