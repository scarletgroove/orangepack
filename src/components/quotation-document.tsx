import Image from "next/image";
import { company } from "@/lib/company";
import type { QuotationWithItems } from "@/lib/data";
import { formatThaiDate } from "@/lib/dates";
import { bahtText, formatBaht, formatQty } from "@/lib/money";

export function QuotationDocument({ q }: { q: QuotationWithItems }) {
  const afterDiscount = q.subtotalSatang - q.discountSatang;
  const discountPercent = q.discountBps / 100;

  return (
    <article className="sheet" aria-label={`ใบเสนอราคา ${q.number}`}>
      <header className="sheet__head">
        <div className="sheet__company">
          <Image src="/brand/logo.png" alt="OrangePack" width={56} height={56} />
          <div>
            <p className="sheet__company-name">{company.name}</p>
            <p>{company.address}</p>
            <p>
              โทร {company.phones.join(", ")} · {company.email}
            </p>
            <p>
              เลขประจำตัวผู้เสียภาษี{" "}
              {company.taxId ?? <span className="sheet__pending">— รอระบุ</span>}
            </p>
          </div>
        </div>
        <div className="sheet__doc">
          <h1 className="sheet__doc-title">
            ใบเสนอราคา
            <small>QUOTATION</small>
          </h1>
          <dl className="sheet__meta">
            <dt>เลขที่</dt>
            <dd className="doc-no">{q.number}</dd>
            <dt>วันที่</dt>
            <dd>{formatThaiDate(q.issueDate)}</dd>
            <dt>ยืนราคาถึง</dt>
            <dd>{formatThaiDate(q.validUntil)}</dd>
          </dl>
        </div>
      </header>

      <section className="sheet__to">
        <span className="sheet__label">เสนอราคาถึง</span>
        <span className="sheet__customer">{q.customerCompany || q.customerName}</span>
        <p>
          {q.customerCompany && (
            <>
              เรียน คุณ{q.customerName}
              <br />
            </>
          )}
          {q.customerAddress && (
            <>
              {q.customerAddress}
              <br />
            </>
          )}
          {[q.customerPhone && `โทร ${q.customerPhone}`, q.customerEmail].filter(Boolean).join(" · ")}
          {q.customerTaxId && (
            <>
              <br />
              เลขประจำตัวผู้เสียภาษี {q.customerTaxId}
            </>
          )}
        </p>
      </section>

      <div className="sheet__table-wrap">
        <table className="sheet__table">
          <thead>
            <tr>
              <th scope="col" className="is-idx">
                #
              </th>
              <th scope="col">รายการ</th>
              <th scope="col" className="is-right">
                จำนวน
              </th>
              <th scope="col" className="is-right">
                ราคา/หน่วย
              </th>
              <th scope="col" className="is-right">
                จำนวนเงิน
              </th>
            </tr>
          </thead>
          <tbody>
            {q.items.map((item, i) => (
              <tr key={item.id}>
                <td className="is-idx num">{i + 1}</td>
                <td>
                  {item.description}
                  {item.variantLabel && <span className="sheet__variant">{item.variantLabel}</span>}
                </td>
                <td className="is-right num">
                  {formatQty(item.quantity)} {item.unit}
                </td>
                <td className="is-right num">{formatBaht(item.unitPriceSatang)}</td>
                <td className="is-right num">{formatBaht(item.lineTotalSatang)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="sheet__foot">
        <div className="sheet__notes">
          {q.notes && (
            <>
              <span className="sheet__label">หมายเหตุ</span>
              <p>{q.notes}</p>
            </>
          )}
        </div>
        <dl className="sheet__totals">
          <div>
            <dt>รวมเป็นเงิน</dt>
            <dd className="num">{formatBaht(q.subtotalSatang)}</dd>
          </div>
          {q.discountSatang > 0 && (
            <>
              <div>
                <dt>ส่วนลด {discountPercent}%</dt>
                <dd className="num">−{formatBaht(q.discountSatang)}</dd>
              </div>
              <div>
                <dt>หลังหักส่วนลด</dt>
                <dd className="num">{formatBaht(afterDiscount)}</dd>
              </div>
            </>
          )}
          {q.vatMode === "exclusive" && (
            <div>
              <dt>ภาษีมูลค่าเพิ่ม {q.vatBps / 100}%</dt>
              <dd className="num">{formatBaht(q.vatSatang)}</dd>
            </div>
          )}
          <div className="sheet__grand">
            <dt>รวมทั้งสิ้น (บาท)</dt>
            <dd className="num">{formatBaht(q.totalSatang)}</dd>
          </div>
        </dl>
      </div>

      <p className="sheet__words">({bahtText(q.totalSatang)})</p>

      <div className="sheet__sign">
        <div>
          <div className="sheet__sign-line" />
          ผู้เสนอราคา · {company.name}
        </div>
        <div>
          <div className="sheet__sign-line" />
          ผู้อนุมัติสั่งซื้อ · วันที่ ____/____/______
        </div>
      </div>
    </article>
  );
}
