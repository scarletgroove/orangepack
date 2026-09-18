import { ClipboardList, FileCheck2, Search } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { ORDER_STATUS_LABEL, OrderStatusChip } from "@/components/order-status-chip";
import type { SalesOrderStatus } from "@/db/schema";
import { countConvertibleQuotations, getSalesOrderStats, listSalesOrders, ORDER_STATUS_FILTERS } from "@/lib/data";
import { formatThaiDateShort, todayInBangkok } from "@/lib/dates";
import { formatBaht } from "@/lib/money";

export const metadata: Metadata = { title: "ใบสั่งขาย" };

function isStatus(value: unknown): value is SalesOrderStatus {
  return typeof value === "string" && (ORDER_STATUS_FILTERS as readonly string[]).includes(value);
}

export default async function OrdersPage(props: PageProps<"/orders">) {
  await connection();
  const params = await props.searchParams;
  const status = isStatus(params.status) ? params.status : undefined;
  const q = typeof params.q === "string" ? params.q.trim().slice(0, 100) : "";

  const [rows, stats, waiting] = await Promise.all([
    listSalesOrders({ status, q: q || undefined }),
    getSalesOrderStats(),
    countConvertibleQuotations(),
  ]);
  const today = todayInBangkok();
  const countOf = (s: SalesOrderStatus) => stats.find((r) => r.status === s)?.count ?? 0;
  const allCount = stats.reduce((n, r) => n + r.count, 0);
  const openOutstanding = stats
    .filter((r) => r.status !== "cancelled")
    .reduce((n, r) => n + Number(r.outstandingSatang), 0);

  const tabHref = (s?: SalesOrderStatus) => {
    const sp = new URLSearchParams();
    if (s) sp.set("status", s);
    if (q) sp.set("q", q);
    const qs = sp.toString();
    return qs ? `/orders?${qs}` : "/orders";
  };

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <h1 className="page__title">ใบสั่งขาย</h1>
          <p className="page__lede">
            {allCount === 0
              ? "ยังไม่มีใบสั่งขาย"
              : `ทั้งหมด ${allCount} ใบ${openOutstanding > 0 ? ` · ค้างชำระรวม ฿${formatBaht(openOutstanding)}` : ""}`}
          </p>
        </div>
        {waiting > 0 && (
          <Link href="/quotations?status=accepted" className="btn btn--primary">
            <FileCheck2 size={18} aria-hidden />
            ใบเสนอราคาอนุมัติรอเปิดงาน {waiting}
          </Link>
        )}
      </div>

      {allCount > 0 && (
        <div className="filters">
          <nav className="filters__tabs" aria-label="กรองตามสถานะ">
            <Link href={tabHref()} className={`filters__tab${!status ? " is-active" : ""}`}>
              ทั้งหมด <span className="num">{allCount}</span>
            </Link>
            {ORDER_STATUS_FILTERS.map((s) => (
              <Link
                key={s}
                href={tabHref(s)}
                className={`filters__tab${status === s ? " is-active" : ""}`}
                aria-current={status === s ? "page" : undefined}
              >
                {ORDER_STATUS_LABEL[s]} <span className="num">{countOf(s)}</span>
              </Link>
            ))}
          </nav>
          <form className="filters__search" role="search" action="/orders">
            {status && <input type="hidden" name="status" value={status} />}
            <label htmlFor="q" className="sr-only">
              ค้นหาใบสั่งขาย
            </label>
            <Search size={16} aria-hidden />
            <input
              id="q"
              name="q"
              type="search"
              className="input"
              defaultValue={q}
              placeholder="เลขที่ ใบเสนอราคา ชื่อลูกค้า"
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
              <th scope="col">เปิดงาน</th>
              <th scope="col">กำหนดส่ง</th>
              <th scope="col" className="is-right">
                ค้างชำระ (บาท)
              </th>
              <th scope="col" className="is-right">
                ยอดรวม (บาท)
              </th>
              <th scope="col" className="is-right">
                สถานะ
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const outstanding = r.totalSatang - r.paidSatang;
              return (
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
                  <td data-col="issued" className="num">
                    {formatThaiDateShort(r.orderDate)}
                  </td>
                  <td data-col="due" className="num">
                    {r.dueDate ? formatThaiDateShort(r.dueDate) : "—"}
                  </td>
                  <td data-col="outstanding" className="is-right num">
                    {outstanding > 0 ? formatBaht(outstanding) : "—"}
                  </td>
                  <td data-col="amount" className="is-right num register__amount">
                    {formatBaht(r.totalSatang)}
                  </td>
                  <td data-col="status" className="is-right">
                    <OrderStatusChip status={r.status} dueDate={r.dueDate} today={today} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      ) : allCount === 0 ? (
        <div className="empty">
          <ClipboardList size={28} aria-hidden />
          <h2 className="empty__title">ยังไม่มีใบสั่งขาย</h2>
          <p>
            ใบสั่งขายเปิดจากใบเสนอราคาที่ลูกค้าอนุมัติแล้ว เปิดใบเสนอราคาที่อนุมัติ แล้วกด “เปิดใบสั่งขาย”
          </p>
          <Link href="/quotations?status=accepted" className="btn btn--primary">
            ดูใบเสนอราคาที่อนุมัติ
          </Link>
        </div>
      ) : (
        <div className="empty">
          <Search size={28} aria-hidden />
          <h2 className="empty__title">ไม่พบใบสั่งขายที่ตรงกัน</h2>
          <p>{q ? `ไม่มีใบสั่งขายที่ตรงกับ “${q}”` : "ไม่มีใบสั่งขายในสถานะนี้"} ลองเปลี่ยนคำค้นหรือดูทั้งหมด</p>
          <Link href="/orders" className="btn btn--quiet">
            ดูทั้งหมด
          </Link>
        </div>
      )}
    </div>
  );
}
