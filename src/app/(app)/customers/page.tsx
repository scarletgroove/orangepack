import { Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { getCustomersWithActivity } from "@/lib/data";
import { formatThaiDateShort } from "@/lib/dates";

export const metadata: Metadata = { title: "ลูกค้า" };

export default async function CustomersPage() {
  await connection();
  const customers = await getCustomersWithActivity();

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <h1 className="page__title">ลูกค้า</h1>
          <p className="page__lede">
            {customers.length > 0 ? `${customers.length} ราย` : "รายชื่อจะเพิ่มเมื่อออกใบเสนอราคาให้ลูกค้าใหม่"}
          </p>
        </div>
      </div>

      {customers.length === 0 ? (
        <div className="empty">
          <Users size={28} aria-hidden />
          <h2 className="empty__title">ยังไม่มีรายชื่อลูกค้า</h2>
          <p>สร้างใบเสนอราคาแล้วเลือก “เพิ่มลูกค้ารายนี้ในรายชื่อลูกค้า” ครั้งต่อไปจะเลือกได้ทันที</p>
          <Link href="/quotations/new" className="btn btn--primary">
            สร้างใบเสนอราคา
          </Link>
        </div>
      ) : (
        <table className="register">
          <thead>
            <tr>
              <th scope="col">ลูกค้า</th>
              <th scope="col">ติดต่อ</th>
              <th scope="col" className="is-right">
                ใบเสนอราคา
              </th>
              <th scope="col" className="is-right">
                ล่าสุด
              </th>
            </tr>
          </thead>
          <tbody>
            {customers.map((c) => (
              <tr key={c.id} className="register__row">
                <td data-col="no">
                  {c.company || c.name}
                  {c.company && <span className="register__sub">{c.name}</span>}
                </td>
                <td data-col="customer" className="num">
                  {c.phone ?? ""}
                  {c.email && <span className="register__sub">{c.email}</span>}
                </td>
                <td data-col="status" className="is-right num">
                  {c.quotationCount} ฉบับ
                </td>
                <td data-col="amount" className="is-right num">
                  {c.lastIssued ? formatThaiDateShort(c.lastIssued) : "–"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
