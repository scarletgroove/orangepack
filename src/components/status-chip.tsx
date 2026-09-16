import type { QuotationStatus } from "@/db/schema";

export const STATUS_LABEL: Record<QuotationStatus, string> = {
  draft: "ร่าง",
  sent: "ส่งแล้ว",
  accepted: "อนุมัติ",
  rejected: "ไม่อนุมัติ",
};

export function StatusChip({
  status,
  validUntil,
  today,
}: {
  status: QuotationStatus;
  validUntil: string;
  today: string;
}) {
  if (status === "sent" && validUntil < today) {
    return <span className="chip chip--expired">เลยกำหนดยืนราคา</span>;
  }
  return <span className={`chip chip--${status}`}>{STATUS_LABEL[status]}</span>;
}
