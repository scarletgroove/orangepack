import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { QuotationEditor } from "@/components/quotation-editor";
import { DEFAULT_VALIDITY_DAYS, defaultQuotationNotes } from "@/lib/company";
import { getCatalog, getCustomers } from "@/lib/data";
import { addDays, todayInBangkok } from "@/lib/dates";

export const metadata: Metadata = { title: "สร้างใบเสนอราคา" };

export default async function NewQuotationPage() {
  await connection();
  const [catalog, customers] = await Promise.all([getCatalog(), getCustomers()]);
  const today = todayInBangkok();

  return (
    <div className="page">
      <Link href="/quotations" className="back-link">
        <ArrowLeft size={16} aria-hidden />
        ใบเสนอราคาทั้งหมด
      </Link>
      <div className="page__head">
        <div>
          <h1 className="page__title">สร้างใบเสนอราคา</h1>
          <p className="page__lede">เลขที่เอกสารจะออกให้อัตโนมัติเมื่อบันทึก</p>
        </div>
      </div>
      <QuotationEditor
        catalog={catalog}
        customers={customers}
        submitLabel="บันทึกใบเสนอราคา"
        initial={{
          id: null,
          customerId: null,
          customer: { name: "", company: "", taxId: "", phone: "", email: "", address: "" },
          issueDate: today,
          validUntil: addDays(today, DEFAULT_VALIDITY_DAYS),
          discountBps: 0,
          vatMode: "exclusive",
          notes: defaultQuotationNotes,
          items: [],
        }}
      />
    </div>
  );
}
