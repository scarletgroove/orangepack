import { FilePlus2, FileText, Search } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { StatusChip, STATUS_LABEL } from "@/components/status-chip";
import type { QuotationStatus } from "@/db/schema";
import { getQuotationStats, listQuotations, STATUS_FILTERS } from "@/lib/data";
import { formatThaiDateShort, todayInBangkok } from "@/lib/dates";
import { formatBaht } from "@/lib/money";

export const metadata: Metadata = { title: "ใบเสนอราคา" };

function isStatus(value: unknown): value is QuotationStatus {
  return typeof value === "string" && (STATUS_FILTERS as readonly string[]).includes(value);
}

export default async function QuotationsPage(props: PageProps<"/quotations">) {
  await connection();
  const params = await props.searchParams;
  const status = isStatus(params.status) ? params.status : undefined;
  const q = typeof params.q === "string" ? params.q.trim().slice(0, 100) : "";

  const [rows, stats] = await Promise.all([
    listQuotations({ status, q: q || undefined }),
    getQuotationStats(),
  ]);
  const today = todayInBangkok();
  const countOf = (s: QuotationStatus) => stats.find((r) => r.status === s)?.count ?? 0;
  const allCount = stats.reduce((n, r) => n + r.count, 0);
  const pending = stats.find((r) => r.status === "sent");

  const tabHref = (s?: QuotationStatus) => {
    const sp = new URLSearchParams();
    if (s) sp.set("status", s);
    if (q) sp.set("q", q);
    const qs = sp.toString();
    return qs ? `/quotations?${qs}` : "/quotations";
  };

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <h1 className="page__title">ใบเสนอราคา</h1>
          <p className="page__lede">
            {allCount === 0
              ? "ยังไม่มีเอกสาร"
              : `ทั้งหมด ${allCount} ฉบับ${
                  pending && pending.count > 0
                    ? ` · รอลูกค้าตอบ ${pending.count} ฉบับ มูลค่า ฿${formatBaht(Number(pending.totalSatang))}`
                    : ""
                }`}
          </p>
        </div>
        <Link href="/quotations/new" className="btn btn--primary">
          <FilePlus2 size={18} aria-hidden />
          สร้างใบเสนอราคา
        </Link>
      </div>

      {allCount > 0 && (
        <div className="filters">
          <nav className="filters__tabs" aria-label="กรองตามสถานะ">
            <Link href={tabHref()} className={`filters__tab${!status ? " is-active" : ""}`}>
              ทั้งหมด <span className="num">{allCount}</span>
            </Link>
            {STATUS_FILTERS.map((s) => (
              <Link
                key={s}
                href={tabHref(s)}
                className={`filters__tab${status === s ? " is-active" : ""}`}
                aria-current={status === s ? "page" : undefined}
              >
                {STATUS_LABEL[s]} <span className="num">{countOf(s)}</span>
              </Link>
            ))}
          </nav>
          <form className="filters__search" role="search" action="/quotations">
            {status && <input type="hidden" name="status" value={status} />}
            <label htmlFor="q" className="sr-only">
              ค้นหาใบเสนอราคา
            </label>
            <Search size={16} aria-hidden />
            <input
              id="q"
              name="q"
              type="search"
              className="input"
              defaultValue={q}
              placeholder="เลขที่ ชื่อลูกค้า หรือบริษัท"
            />
          </form>
        </div>
      )}

      {rows.length > 0 ? (
        <table className="register">
          <thead>
            <tr>
              <th scope="col">เลขที่</th>
              <th scope="col">ลูกค้า</th>
              <th scope="col">วันที่ออก</th>
              <th scope="col">ยืนราคาถึง</th>
              <th scope="col" className="is-right">
                ยอดรวม (บาท)
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
                  <Link href={`/quotations/${r.id}`} className="register__link doc-no">
                    {r.number}
                  </Link>
                </td>
                <td data-col="customer">
                  {r.customerName}
                  {r.customerCompany && <span className="register__sub">{r.customerCompany}</span>}
                </td>
                <td data-col="issued" className="num">
                  {formatThaiDateShort(r.issueDate)}
                </td>
                <td data-col="valid" className="num">
                  {formatThaiDateShort(r.validUntil)}
                </td>
                <td data-col="amount" className="is-right num register__amount">
                  {formatBaht(r.totalSatang)}
                </td>
                <td data-col="status" className="is-right">
                  <StatusChip status={r.status} validUntil={r.validUntil} today={today} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : allCount === 0 ? (
        <div className="empty">
          <FileText size={28} aria-hidden />
          <h2 className="empty__title">ยังไม่มีใบเสนอราคา</h2>
          <p>สร้างฉบับแรกได้เลย เลือกสินค้าแล้วระบบจะใส่ราคาตามจำนวนสั่งให้อัตโนมัติ</p>
          <Link href="/quotations/new" className="btn btn--primary">
            สร้างใบเสนอราคา
          </Link>
        </div>
      ) : (
        <div className="empty">
          <Search size={28} aria-hidden />
          <h2 className="empty__title">ไม่พบเอกสารที่ตรงกัน</h2>
          <p>
            {q ? `ไม่มีใบเสนอราคาที่ตรงกับ “${q}”` : "ไม่มีเอกสารในสถานะนี้"} ลองเปลี่ยนคำค้นหรือดูทั้งหมด
          </p>
          <Link href="/quotations" className="btn btn--quiet">
            ดูทั้งหมด
          </Link>
        </div>
      )}
    </div>
  );
}
