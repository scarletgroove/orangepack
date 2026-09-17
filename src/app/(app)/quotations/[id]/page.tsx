import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { z } from "zod";
import { QuotationActions } from "@/components/quotation-actions";
import { QuotationDocument } from "@/components/quotation-document";
import { StatusChip } from "@/components/status-chip";
import { getQuotation } from "@/lib/data";
import { formatThaiDateTime, todayInBangkok } from "@/lib/dates";

export async function generateMetadata(props: PageProps<"/quotations/[id]">): Promise<Metadata> {
  const { id } = await props.params;
  if (!z.uuid().safeParse(id).success) return { title: "ไม่พบเอกสาร" };
  const q = await getQuotation(id);
  return { title: q ? `${q.number} · ${q.customerCompany || q.customerName}` : "ไม่พบเอกสาร" };
}

export default async function QuotationPage(props: PageProps<"/quotations/[id]">) {
  await connection();
  const { id } = await props.params;
  if (!z.uuid().safeParse(id).success) notFound();
  const quotation = await getQuotation(id);
  if (!quotation) notFound();

  return (
    <div className="page page--narrow">
      <Link href="/quotations" className="back-link no-print">
        <ArrowLeft size={16} aria-hidden />
        ใบเสนอราคาทั้งหมด
      </Link>
      <div className="doc-toolbar no-print">
        <div className="doc-toolbar__status">
          <p className="doc-toolbar__title doc-no">{quotation.number}</p>
          <StatusChip status={quotation.status} validUntil={quotation.validUntil} today={todayInBangkok()} />
        </div>
        <QuotationActions id={quotation.id} status={quotation.status} />
      </div>
      <p className="doc-audit no-print">
        {quotation.createdByEmail && (
          <>สร้างโดย {quotation.createdByName || quotation.createdByEmail} · </>
        )}
        แก้ไขล่าสุด {formatThaiDateTime(quotation.updatedAt)}
        {quotation.updatedByEmail && <> โดย {quotation.updatedByName || quotation.updatedByEmail}</>}
      </p>
      <QuotationDocument q={quotation} />
    </div>
  );
}
