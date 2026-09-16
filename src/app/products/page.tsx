import type { Metadata } from "next";
import Image from "next/image";
import { connection } from "next/server";
import { getCatalog, type CatalogVariant } from "@/lib/data";
import { formatBaht, formatQty } from "@/lib/money";

export const metadata: Metadata = { title: "สินค้าและราคา" };

function TierTable({ variants }: { variants: CatalogVariant[] }) {
  const qtys = [...new Set(variants.flatMap((v) => v.tiers.map((t) => t.minQty)))].sort((a, b) => a - b);
  return (
    <div className="tier-table-wrap">
      <table className="tier-table num">
        <thead>
          <tr>
            <th scope="col">ขนาด / แบบ</th>
            {qtys.map((q) => (
              <th key={q} scope="col">
                {formatQty(q)}+
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {variants.map((v) => {
            const byQty = new Map(v.tiers.map((t) => [t.minQty, t.unitPriceSatang]));
            return (
              <tr key={v.id}>
                <th scope="row">
                  {v.label}
                  {v.printMethod ? ` · ${v.printMethod}` : ""}
                </th>
                {qtys.map((q) => (
                  <td key={q}>{byQty.has(q) ? formatBaht(byQty.get(q)!) : "–"}</td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default async function ProductsPage() {
  await connection();
  const catalog = await getCatalog();
  const categories = [...new Set(catalog.map((p) => p.category))];

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <h1 className="page__title">สินค้าและราคา</h1>
          <p className="page__lede">
            ราคาต่อหน่วย (บาท) ตามจำนวนสั่ง นำเข้าจาก theorangepack.com · ใบเสนอราคาใช้ตารางนี้ใส่ราคาให้อัตโนมัติ
          </p>
        </div>
      </div>

      {catalog.length === 0 ? (
        <div className="empty">
          <h2 className="empty__title">ยังไม่มีข้อมูลสินค้า</h2>
          <p>
            นำเข้าแคตตาล็อกด้วยคำสั่ง <code>npm run db:seed</code>
          </p>
        </div>
      ) : (
        categories.map((category) => (
          <section key={category} className="catalog-group">
            <h2 className="catalog-group__title">{category}</h2>
            {catalog
              .filter((p) => p.category === category)
              .map((p) => {
                const methods = [...new Set(p.variants.map((v) => v.printMethod))];
                return (
                  <article key={p.id} className="product">
                    {p.image ? (
                      <Image className="product__img" src={p.image} alt={p.name} width={72} height={72} />
                    ) : (
                      <span className="product__img" />
                    )}
                    <div style={{ minWidth: 0 }}>
                      <h3 className="product__name">{p.name}</h3>
                      <p className="product__facts">
                        <span>ขั้นต่ำ {formatQty(p.moq)} ใบ</span>
                        {p.leadDays && <span>ผลิต {p.leadDays} วันทำการ</span>}
                        <span>{p.variants.length} ขนาด/แบบ</span>
                      </p>
                      {p.summary && <p className="muted" style={{ fontSize: "var(--text-sm)" }}>{p.summary}</p>}
                      <details>
                        <summary>ดูตารางราคา</summary>
                        {methods.map((method) => (
                          <div key={method ?? "all"}>
                            {method && (
                              <p className="muted" style={{ fontSize: "var(--text-xs)", marginTop: "var(--space-xs)" }}>
                                พิมพ์ระบบ {method}
                              </p>
                            )}
                            <TierTable variants={p.variants.filter((v) => v.printMethod === method)} />
                          </div>
                        ))}
                      </details>
                    </div>
                  </article>
                );
              })}
          </section>
        ))
      )}
    </div>
  );
}
