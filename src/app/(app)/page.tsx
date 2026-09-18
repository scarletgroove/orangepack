import { AlertTriangle, ArrowRight, CalendarClock, ClipboardList, FileCheck2, Wallet } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { OrderStatusChip } from "@/components/order-status-chip";
import { countConvertibleQuotations, listOpenJobs, listPendingQuotations } from "@/lib/data";
import { formatThaiDateShort, todayInBangkok } from "@/lib/dates";
import { jobUrgency, urgencyLabel, type JobUrgency } from "@/lib/jobs";
import { formatBaht } from "@/lib/money";
import { outstandingOf } from "@/lib/order-math";

export const metadata: Metadata = { title: "ภาพรวมงาน" };

const URGENCY_CLASS: Record<JobUrgency["kind"], string> = {
  overdue: "due due--late",
  "due-soon": "due due--soon",
  scheduled: "due",
  unscheduled: "due due--none",
  closed: "due",
};

export default async function DashboardPage() {
  await connection();
  const today = todayInBangkok();

  const [jobs, pendingQuotations, waitingToOpen] = await Promise.all([
    listOpenJobs(),
    listPendingQuotations(),
    countConvertibleQuotations(),
  ]);

  const rows = jobs.map((job) => ({
    ...job,
    urgency: jobUrgency(job.status, job.dueDate, today),
    outstanding: outstandingOf(job.totalSatang, job.paidSatang),
  }));
  const overdue = rows.filter((r) => r.urgency.kind === "overdue");
  const dueSoon = rows.filter((r) => r.urgency.kind === "due-soon");
  const unscheduled = rows.filter((r) => r.urgency.kind === "unscheduled");
  const outstandingTotal = rows.reduce((sum, r) => sum + r.outstanding, 0);

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <h1 className="page__title">ภาพรวมงาน</h1>
          <p className="page__lede">
            {rows.length === 0
              ? "ยังไม่มีงานที่กำลังดำเนินการ"
              : `งานที่ยังไม่ส่ง ${rows.length} ใบ${overdue.length > 0 ? ` · เลยกำหนดส่ง ${overdue.length} ใบ` : ""}`}
          </p>
        </div>
      </div>

      <div className="tiles">
        <div className={`tile${overdue.length > 0 ? " tile--alert" : ""}`}>
          <span className="tile__label">
            <AlertTriangle size={16} aria-hidden />
            เลยกำหนดส่ง
          </span>
          <strong className="tile__value num">{overdue.length}</strong>
          <span className="tile__note">
            {overdue.length > 0 ? `ช้าสุด ${Math.abs(overdue[0].urgency.days ?? 0)} วัน` : "ไม่มีงานค้าง"}
          </span>
        </div>
        <div className="tile">
          <span className="tile__label">
            <CalendarClock size={16} aria-hidden />
            ครบกำหนดใน 7 วัน
          </span>
          <strong className="tile__value num">{dueSoon.length}</strong>
          <span className="tile__note">
            {unscheduled.length > 0 ? `ยังไม่กำหนดวันส่ง ${unscheduled.length} ใบ` : "กำหนดวันส่งครบทุกใบ"}
          </span>
        </div>
        <div className="tile">
          <span className="tile__label">
            <Wallet size={16} aria-hidden />
            ค้างชำระ
          </span>
          <strong className="tile__value num">฿{formatBaht(outstandingTotal)}</strong>
          <span className="tile__note">จากงานที่ยังไม่ส่ง {rows.length} ใบ</span>
        </div>
        <Link
          href={waitingToOpen > 0 ? "/quotations?status=accepted" : "/quotations"}
          className={`tile tile--link${waitingToOpen > 0 ? " tile--action" : ""}`}
        >
          <span className="tile__label">
            <FileCheck2 size={16} aria-hidden />
            อนุมัติแล้ว รอเปิดงาน
          </span>
          <strong className="tile__value num">{waitingToOpen}</strong>
          <span className="tile__note">
            {waitingToOpen > 0 ? "เปิดใบสั่งขายให้ลูกค้า" : "เปิดงานครบทุกใบแล้ว"}
          </span>
        </Link>
      </div>

      <section className="section">
        <div className="section__head">
          <h2 className="section__title">งานที่ต้องติดตาม</h2>
          <Link href="/orders" className="back-link">
            ใบสั่งขายทั้งหมด
            <ArrowRight size={16} aria-hidden />
          </Link>
        </div>

        {rows.length > 0 ? (
          <table className="register">
            <thead>
              <tr>
                <th scope="col">เลขที่</th>
                <th scope="col">ลูกค้า</th>
                <th scope="col">กำหนดส่ง</th>
                <th scope="col" className="is-right">
                  ค้างชำระ (บาท)
                </th>
                <th scope="col" className="is-right">
                  สถานะ
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="register__row">
                  <td data-col="no">
                    <Link href={`/orders/${r.id}`} className="register__link doc-no">
                      {r.number}
                    </Link>
                  </td>
                  <td data-col="customer">
                    {r.customerName}
                    {r.customerCompany && <span className="register__sub">{r.customerCompany}</span>}
                  </td>
                  <td data-col="due">
                    <span className="num">{r.dueDate ? formatThaiDateShort(r.dueDate) : "—"}</span>
                    <span className={`register__sub ${URGENCY_CLASS[r.urgency.kind]}`}>
                      {urgencyLabel(r.urgency)}
                    </span>
                  </td>
                  <td data-col="outstanding" className="is-right num">
                    {r.outstanding > 0 ? formatBaht(r.outstanding) : "—"}
                  </td>
                  <td data-col="status" className="is-right">
                    <OrderStatusChip status={r.status} dueDate={r.dueDate} today={today} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="empty">
            <ClipboardList size={28} aria-hidden />
            <h2 className="empty__title">ไม่มีงานค้างอยู่</h2>
            <p>ใบสั่งขายที่ยังไม่ส่งจะขึ้นที่นี่ เรียงตามกำหนดส่ง</p>
            <Link href="/quotations" className="btn btn--quiet">
              ไปที่ใบเสนอราคา
            </Link>
          </div>
        )}
      </section>

      {pendingQuotations.length > 0 && (
        <section className="section">
          <div className="section__head">
            <h2 className="section__title">ใบเสนอราคารอลูกค้าตอบ</h2>
            <Link href="/quotations?status=sent" className="back-link">
              ดูทั้งหมด
              <ArrowRight size={16} aria-hidden />
            </Link>
          </div>
          <table className="register">
            <thead>
              <tr>
                <th scope="col">เลขที่</th>
                <th scope="col">ลูกค้า</th>
                <th scope="col">ยืนราคาถึง</th>
                <th scope="col" className="is-right">
                  ยอดรวม (บาท)
                </th>
              </tr>
            </thead>
            <tbody>
              {pendingQuotations.map((q) => {
                const daysLeft = jobUrgency("awaiting_production", q.validUntil, today);
                return (
                  <tr key={q.id} className="register__row">
                    <td data-col="no">
                      <Link href={`/quotations/${q.id}`} className="register__link doc-no">
                        {q.number}
                      </Link>
                    </td>
                    <td data-col="customer">
                      {q.customerName}
                      {q.customerCompany && <span className="register__sub">{q.customerCompany}</span>}
                    </td>
                    <td data-col="valid">
                      <span className="num">{formatThaiDateShort(q.validUntil)}</span>
                      <span className={`register__sub ${URGENCY_CLASS[daysLeft.kind]}`}>
                        {daysLeft.kind === "overdue" ? "เลยกำหนดยืนราคา" : urgencyLabel(daysLeft)}
                      </span>
                    </td>
                    <td data-col="amount" className="is-right num register__amount">
                      {formatBaht(q.totalSatang)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
