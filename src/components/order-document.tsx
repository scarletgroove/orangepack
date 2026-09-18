import Image from "next/image";
import Link from "next/link";
import { ORDER_STATUS_LABEL } from "@/components/order-status-chip";
import { company } from "@/lib/company";
import type { SalesOrderWithItems } from "@/lib/data";
import { formatThaiDate } from "@/lib/dates";
import { bahtText, formatBaht, formatQty } from "@/lib/money";
import { depositOf, outstandingOf } from "@/lib/order-math";

export function OrderDocument({ order }: { order: SalesOrderWithItems }) {
  const afterDiscount = order.subtotalSatang - order.discountSatang;
  const depositSatang = depositOf(order.totalSatang, order.depositBps);
  const outstanding = outstandingOf(order.totalSatang, order.paidSatang);

  return (
    <article className="sheet" aria-label={`ใบสั่งขาย ${order.number}`}>
      <header className="sheet__head">
        <Image className="sheet__logo" src="/brand/logo.png" alt={company.name} width={112} height={112} priority />
        <div className="sheet__doc">
          <h1 className="sheet__doc-title">
            ใบสั่งขาย
            <small>SALES ORDER</small>
          </h1>
          <dl className="sheet__meta">
            <dt>เลขที่</dt>
            <dd className="doc-no">{order.number}</dd>
            <dt>วันที่เปิดงาน</dt>
            <dd>{formatThaiDate(order.orderDate)}</dd>
            <dt>กำหนดส่ง</dt>
            <dd>{order.dueDate ? formatThaiDate(order.dueDate) : "ยังไม่กำหนด"}</dd>
            <dt>สถานะ</dt>
            <dd>{ORDER_STATUS_LABEL[order.status]}</dd>
            {order.quotationNumber && (
              <>
                <dt>ใบเสนอราคา</dt>
                <dd>
                  {order.quotationId ? (
                    <Link href={`/quotations/${order.quotationId}`} className="doc-no">
                      {order.quotationNumber}
                    </Link>
                  ) : (
                    <span className="doc-no">{order.quotationNumber}</span>
                  )}
                </dd>
              </>
            )}
          </dl>
        </div>
      </header>

      {order.status === "cancelled" && (
        <p className="sheet__stamp" role="status">
          ยกเลิกแล้ว · CANCELLED
        </p>
      )}

      <section className="sheet__to">
        <span className="sheet__label">ลูกค้า</span>
        <span className="sheet__customer">{order.customerCompany || order.customerName}</span>
        <p>
          {order.customerCompany && (
            <>
              ผู้ติดต่อ คุณ{order.customerName}
              <br />
            </>
          )}
          {order.customerAddress && (
            <>
              {order.customerAddress}
              <br />
            </>
          )}
          {[order.customerPhone && `โทร ${order.customerPhone}`, order.customerEmail].filter(Boolean).join(" · ")}
          {order.customerTaxId && (
            <>
              <br />
              เลขประจำตัวผู้เสียภาษี {order.customerTaxId}
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
            {order.items.map((item, i) => (
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
          {order.notes && (
            <>
              <span className="sheet__label">หมายเหตุการผลิต</span>
              <p>{order.notes}</p>
            </>
          )}
        </div>
        <dl className="sheet__totals">
          <div>
            <dt>รวมเป็นเงิน</dt>
            <dd className="num">{formatBaht(order.subtotalSatang)}</dd>
          </div>
          {order.discountSatang > 0 && (
            <>
              <div>
                <dt>ส่วนลด {order.discountBps / 100}%</dt>
                <dd className="num">−{formatBaht(order.discountSatang)}</dd>
              </div>
              <div>
                <dt>หลังหักส่วนลด</dt>
                <dd className="num">{formatBaht(afterDiscount)}</dd>
              </div>
            </>
          )}
          {order.vatMode === "exclusive" && (
            <div>
              <dt>ภาษีมูลค่าเพิ่ม {order.vatBps / 100}%</dt>
              <dd className="num">{formatBaht(order.vatSatang)}</dd>
            </div>
          )}
          <div className="sheet__grand">
            <dt>รวมทั้งสิ้น (บาท)</dt>
            <dd className="num">{formatBaht(order.totalSatang)}</dd>
          </div>
          <div className="sheet__pay">
            <dt>มัดจำ {order.depositBps / 100}%</dt>
            <dd className="num">{formatBaht(depositSatang)}</dd>
          </div>
          <div className="sheet__pay">
            <dt>ชำระแล้ว</dt>
            <dd className="num">{formatBaht(order.paidSatang)}</dd>
          </div>
          <div className="sheet__pay sheet__pay--due">
            <dt>{outstanding > 0 ? "ค้างชำระ" : "ชำระครบแล้ว"}</dt>
            <dd className="num">{formatBaht(outstanding)}</dd>
          </div>
        </dl>
      </div>

      <p className="sheet__words">({bahtText(order.totalSatang)})</p>

      <div className="sheet__sign">
        <div>
          <div className="sheet__sign-line" />
          ผู้เปิดงาน · {company.name}
        </div>
        <div>
          <div className="sheet__sign-line" />
          ผู้รับสินค้า · วันที่ ____/____/______
        </div>
      </div>
    </article>
  );
}
