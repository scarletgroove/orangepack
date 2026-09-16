import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { z } from "zod";
import { QuotationEditor } from "@/components/quotation-editor";
import { getCatalog, getCustomers, getQuotation } from "@/lib/data";

export const metadata: Metadata = { title: "แก้ไขใบเสนอราคา" };

export default async function EditQuotationPage(props: PageProps<"/quotations/[id]/edit">) {
  await connection();
  const { id } = await props.params;
  if (!z.uuid().safeParse(id).success) notFound();

  const [quotation, catalog, customers] = await Promise.all([
    getQuotation(id),
    getCatalog(),
    getCustomers(),
  ]);
  if (!quotation) notFound();

  return (
    <div className="page">
      <Link href={`/quotations/${id}`} className="back-link">
        <ArrowLeft size={16} aria-hidden />
        กลับไปที่เอกสาร
      </Link>
      <div className="page__head">
        <div>
          <h1 className="page__title">
            แก้ไข <span className="doc-no">{quotation.number}</span>
          </h1>
          <p className="page__lede">เลขที่เอกสารและสถานะคงเดิม</p>
        </div>
      </div>
      <QuotationEditor
        catalog={catalog}
        customers={customers}
        submitLabel="บันทึกการแก้ไข"
        initial={{
          id: quotation.id,
          customerId: quotation.customerId,
          customer: {
            name: quotation.customerName,
            company: quotation.customerCompany ?? "",
            taxId: quotation.customerTaxId ?? "",
            phone: quotation.customerPhone ?? "",
            email: quotation.customerEmail ?? "",
            address: quotation.customerAddress ?? "",
          },
          issueDate: quotation.issueDate,
          validUntil: quotation.validUntil,
          discountBps: quotation.discountBps,
          vatMode: quotation.vatMode,
          notes: quotation.notes ?? "",
          items: quotation.items.map((item) => ({
            productId: item.productId,
            variantId: item.variantId,
            description: item.description,
            unit: item.unit,
            quantity: item.quantity,
            unitPriceSatang: item.unitPriceSatang,
          })),
        }}
      />
    </div>
  );
}
