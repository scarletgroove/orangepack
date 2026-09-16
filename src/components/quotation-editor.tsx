"use client";

import { AlertCircle, PackagePlus, PenLine, Plus, Trash2, Undo2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useActionState, useId, useMemo, useRef, useState, type FormEvent } from "react";
import { saveQuotation } from "@/app/(app)/quotations/actions";
import type { VatMode } from "@/db/schema";
import type { CatalogProduct, CatalogVariant, CustomerRecord } from "@/lib/data";
import {
  bahtText,
  computeTotals,
  formatBaht,
  formatQty,
  parseBahtInput,
  parseQtyInput,
  satangToInput,
} from "@/lib/money";
import { matchTier } from "@/lib/pricing";
import type { QuotationInput, SaveState } from "@/lib/quotation-input";

const PROMO_MIN_QTY = 5000;
const PROMO_DISCOUNT_PERCENT = "8";

type CustomerFields = QuotationInput["customer"];

export type EditorInitial = {
  id: string | null;
  customerId: number | null;
  customer: CustomerFields;
  issueDate: string;
  validUntil: string;
  discountBps: number;
  vatMode: VatMode;
  notes: string;
  items: {
    productId: number | null;
    variantId: number | null;
    description: string;
    unit: string;
    quantity: number;
    unitPriceSatang: number;
  }[];
};

type Row = {
  key: string;
  kind: "catalog" | "custom";
  productId: number | null;
  variantId: number | null;
  description: string;
  unit: string;
  qtyInput: string;
  priceInput: string;
  priceOverridden: boolean;
};

const emptyCustomer: CustomerFields = {
  name: "",
  company: "",
  taxId: "",
  phone: "",
  email: "",
  address: "",
};

function tierPriceInput(variant: CatalogVariant | undefined, qtyInput: string) {
  if (!variant) return "";
  const qty = parseQtyInput(qtyInput) ?? variant.tiers[0]?.minQty ?? 0;
  const match = matchTier(variant.tiers, qty);
  return match ? satangToInput(match.tier.unitPriceSatang) : "";
}

export function QuotationEditor({
  catalog,
  customers,
  initial,
  submitLabel,
}: {
  catalog: CatalogProduct[];
  customers: CustomerRecord[];
  initial: EditorInitial;
  submitLabel: string;
}) {
  const uid = useId();
  const [state, formAction, pending] = useActionState<SaveState, FormData>(saveQuotation, null);

  const productById = useMemo(() => new Map(catalog.map((p) => [p.id, p])), [catalog]);
  const variantById = useMemo(
    () => new Map(catalog.flatMap((p) => p.variants.map((v) => [v.id, v] as const))),
    [catalog],
  );
  const categories = useMemo(() => [...new Set(catalog.map((p) => p.category))], [catalog]);

  const nextKey = useRef(initial.items.length);
  const newKey = () => `row-${nextKey.current++}`;

  const [customerId, setCustomerId] = useState<number | null>(initial.customerId);
  const [customer, setCustomer] = useState<CustomerFields>(initial.customer);
  const [saveCustomer, setSaveCustomer] = useState(true);
  const [issueDate, setIssueDate] = useState(initial.issueDate);
  const [validUntil, setValidUntil] = useState(initial.validUntil);
  const [discountInput, setDiscountInput] = useState(
    initial.discountBps ? String(initial.discountBps / 100) : "0",
  );
  const [vatMode, setVatMode] = useState<VatMode>(initial.vatMode);
  const [notes, setNotes] = useState(initial.notes);
  const [showErrors, setShowErrors] = useState(false);
  const [clientError, setClientError] = useState<string | null>(null);
  const [removed, setRemoved] = useState<{ row: Row; index: number } | null>(null);
  const [rows, setRows] = useState<Row[]>(() =>
    initial.items.map((item, i) => {
      const variant = item.variantId ? variantById.get(item.variantId) : undefined;
      const priceInput = satangToInput(item.unitPriceSatang);
      return {
        key: `row-${i}`,
        kind: item.variantId ? "catalog" : "custom",
        productId: item.productId,
        variantId: item.variantId,
        description: item.description,
        unit: item.unit,
        qtyInput: String(item.quantity),
        priceInput,
        priceOverridden: variant
          ? tierPriceInput(variant, String(item.quantity)) !== priceInput
          : false,
      };
    }),
  );

  const updateRow = (key: string, change: (row: Row) => Row) => {
    setRemoved(null);
    setRows((current) => current.map((r) => (r.key === key ? change(r) : r)));
  };

  const addCatalogRow = () => {
    setRemoved(null);
    setRows((current) => [
      ...current,
      {
        key: newKey(),
        kind: "catalog",
        productId: null,
        variantId: null,
        description: "",
        unit: "ใบ",
        qtyInput: "",
        priceInput: "",
        priceOverridden: false,
      },
    ]);
  };

  const addCustomRow = () => {
    setRemoved(null);
    setRows((current) => [
      ...current,
      {
        key: newKey(),
        kind: "custom",
        productId: null,
        variantId: null,
        description: "",
        unit: "งาน",
        qtyInput: "1",
        priceInput: "",
        priceOverridden: true,
      },
    ]);
  };

  const removeRow = (index: number) => {
    setRemoved({ row: rows[index], index });
    setRows(rows.filter((_, i) => i !== index));
  };

  const undoRemove = () => {
    if (!removed) return;
    setRows((current) => [
      ...current.slice(0, removed.index),
      removed.row,
      ...current.slice(removed.index),
    ]);
    setRemoved(null);
  };

  const discountPercent = Number(discountInput);
  const discountValid =
    /^\d{1,3}(\.\d{1,2})?$/.test(discountInput.trim()) && discountPercent >= 0 && discountPercent <= 100;
  const discountBps = discountValid ? Math.round(discountPercent * 100) : 0;

  const lines = rows.map((row) => {
    const variant = row.variantId ? variantById.get(row.variantId) : undefined;
    const quantity = parseQtyInput(row.qtyInput);
    const unitPriceSatang = parseBahtInput(row.priceInput);
    const match = variant && quantity ? matchTier(variant.tiers, quantity) : null;
    const problems = {
      product: row.kind === "catalog" && !variant,
      description: row.kind === "custom" && row.description.trim() === "",
      quantity: quantity === null,
      price: unitPriceSatang === null,
    };
    return {
      row,
      variant,
      product: row.productId ? productById.get(row.productId) : undefined,
      quantity: quantity ?? 0,
      unitPriceSatang: unitPriceSatang ?? 0,
      match,
      problems,
      valid: !Object.values(problems).some(Boolean),
    };
  });

  const totals = computeTotals(lines, discountBps, vatMode);
  const catalogQty = lines.reduce((n, l) => n + (l.row.kind === "catalog" ? l.quantity : 0), 0);

  const firstProblem = (() => {
    if (customer.name.trim() === "") return "กรอกชื่อผู้ติดต่อของลูกค้า";
    if (customer.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email)) return "อีเมลลูกค้าไม่ถูกต้อง";
    if (rows.length === 0) return "เพิ่มอย่างน้อย 1 รายการ";
    const bad = lines.findIndex((l) => !l.valid);
    if (bad >= 0) return `รายการที่ ${bad + 1} ยังกรอกไม่ครบ`;
    if (!discountValid) return "ส่วนลดต้องเป็นตัวเลข 0–100";
    if (!issueDate || !validUntil) return "ระบุวันที่ออกเอกสารและวันยืนราคา";
    if (validUntil < issueDate) return "วันยืนราคาต้องไม่ก่อนวันที่ออกเอกสาร";
    return null;
  })();

  const payload: QuotationInput = {
    id: initial.id,
    customerId,
    saveCustomer,
    customer,
    issueDate,
    validUntil,
    discountBps,
    vatMode,
    notes,
    items: lines.map((l) => ({
      productId: l.row.kind === "catalog" ? l.row.productId : null,
      variantId: l.row.kind === "catalog" ? l.row.variantId : null,
      description: l.row.kind === "custom" ? l.row.description.trim() : "",
      unit: l.row.unit,
      quantity: l.quantity,
      unitPriceSatang: l.unitPriceSatang,
    })),
  };

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    if (firstProblem) {
      event.preventDefault();
      setShowErrors(true);
      setClientError(firstProblem);
      return;
    }
    setClientError(null);
  };

  const selectCustomer = (value: string) => {
    if (value === "") {
      setCustomerId(null);
      setCustomer(emptyCustomer);
      return;
    }
    const found = customers.find((c) => c.id === Number(value));
    if (!found) return;
    setCustomerId(found.id);
    setCustomer({
      name: found.name,
      company: found.company ?? "",
      taxId: found.taxId ?? "",
      phone: found.phone ?? "",
      email: found.email ?? "",
      address: found.address ?? "",
    });
  };

  const customerField = (field: keyof CustomerFields, label: string, props: Record<string, unknown> = {}) => (
    <div className={`field${field === "address" ? " span-2" : ""}`}>
      <label className="field__label" htmlFor={`${uid}-c-${field}`}>
        {label}
        {field === "name" && <em> *</em>}
      </label>
      {field === "address" ? (
        <textarea
          id={`${uid}-c-${field}`}
          className="textarea"
          rows={2}
          value={customer[field]}
          onChange={(e) => setCustomer({ ...customer, [field]: e.target.value })}
        />
      ) : (
        <input
          id={`${uid}-c-${field}`}
          className="input"
          value={customer[field]}
          onChange={(e) => setCustomer({ ...customer, [field]: e.target.value })}
          aria-invalid={showErrors && field === "name" && customer.name.trim() === "" ? true : undefined}
          {...props}
        />
      )}
      {field !== "address" && (
        <p className={`field__help${showErrors && field === "name" && !customer.name.trim() ? " is-error" : ""}`}>
          {showErrors && field === "name" && !customer.name.trim() ? "ต้องระบุชื่อผู้ติดต่อ" : ""}
        </p>
      )}
    </div>
  );

  const errorMessage = clientError && firstProblem ? firstProblem : state && !state.ok ? state.message : null;

  return (
    <form action={formAction} onSubmit={onSubmit} noValidate>
      <input type="hidden" name="payload" value={JSON.stringify(payload)} />

      {errorMessage && (
        <div className="alert" role="alert">
          <AlertCircle size={18} aria-hidden />
          <span>{errorMessage}</span>
        </div>
      )}

      <div className="editor">
        <div>
          <section className="section" aria-labelledby={`${uid}-customer`}>
            <div className="section__head">
              <h2 className="section__title" id={`${uid}-customer`}>
                ลูกค้า
              </h2>
            </div>
            <div className="grid-fields">
              <div className="field span-2">
                <label className="field__label" htmlFor={`${uid}-customer-pick`}>
                  เลือกจากรายชื่อลูกค้า
                </label>
                <select
                  id={`${uid}-customer-pick`}
                  className="select"
                  value={customerId ?? ""}
                  onChange={(e) => selectCustomer(e.target.value)}
                >
                  <option value="">ลูกค้าใหม่ (กรอกข้อมูลด้านล่าง)</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.company ? `${c.company} — ${c.name}` : c.name}
                    </option>
                  ))}
                </select>
                <p className="field__help">
                  {customerId
                    ? "แก้ข้อมูลด้านล่างได้ จะมีผลเฉพาะใบเสนอราคานี้"
                    : customers.length === 0
                      ? "ยังไม่มีรายชื่อ ลูกค้าจะถูกบันทึกเมื่อบันทึกใบเสนอราคา"
                      : ""}
                </p>
              </div>
              {customerField("name", "ชื่อผู้ติดต่อ", { autoComplete: "off" })}
              {customerField("company", "ชื่อร้าน / บริษัท")}
              {customerField("phone", "เบอร์โทร", { inputMode: "tel", placeholder: "08x-xxx-xxxx" })}
              {customerField("email", "อีเมล", { type: "email", inputMode: "email" })}
              {customerField("taxId", "เลขประจำตัวผู้เสียภาษี", { inputMode: "numeric" })}
              <div className="field" />
              {customerField("address", "ที่อยู่")}
              {customerId === null && (
                <label className="check span-2">
                  <input
                    type="checkbox"
                    checked={saveCustomer}
                    onChange={(e) => setSaveCustomer(e.target.checked)}
                  />
                  เพิ่มลูกค้ารายนี้ในรายชื่อลูกค้า
                </label>
              )}
            </div>
          </section>

          <section className="section" aria-labelledby={`${uid}-items`}>
            <div className="section__head">
              <h2 className="section__title" id={`${uid}-items`}>
                รายการสินค้า
              </h2>
              <span className="muted num" style={{ fontSize: "var(--text-sm)" }}>
                {rows.length} รายการ
              </span>
            </div>

            <div className="items">
              {lines.map((line, index) => {
                const { row, variant, product, match, problems } = line;
                const id = `${uid}-${row.key}`;
                const tierPrice = tierPriceInput(variant, row.qtyInput);
                const qtyHelp =
                  showErrors && problems.quantity
                    ? { cls: "is-error", text: "ใส่จำนวนเป็นจำนวนเต็มมากกว่า 0" }
                    : match?.belowMinimum
                      ? { cls: "is-warn", text: `ต่ำกว่าขั้นต่ำ ${formatQty(match.tier.minQty)} ${row.unit}` }
                      : match
                        ? { cls: "", text: `ราคาขั้น ${formatQty(match.tier.minQty)}+ ${row.unit}` }
                        : { cls: "", text: "" };

                return (
                  <div className="item" key={row.key}>
                    <div className="item__index">
                      <span>รายการที่ {index + 1}</span>
                      <button
                        type="button"
                        className="btn btn--ghost btn--icon btn--danger"
                        onClick={() => removeRow(index)}
                        aria-label={`ลบรายการที่ ${index + 1}`}
                      >
                        <Trash2 size={16} aria-hidden />
                      </button>
                    </div>

                    <div className="item__product">
                      {row.kind === "catalog" && product?.image ? (
                        <Image className="item__thumb" src={product.image} alt="" width={44} height={44} />
                      ) : (
                        <span className="item__thumb item__thumb--blank" aria-hidden>
                          {row.kind === "custom" ? <PenLine size={18} /> : <PackagePlus size={18} />}
                        </span>
                      )}

                      {row.kind === "catalog" ? (
                        <div className="item__selects">
                          <div className="field">
                            <label className="field__label" htmlFor={`${id}-product`}>
                              สินค้า
                            </label>
                            <select
                              id={`${id}-product`}
                              className="select"
                              value={row.productId ?? ""}
                              aria-invalid={showErrors && problems.product ? true : undefined}
                              onChange={(e) => {
                                const next = productById.get(Number(e.target.value));
                                updateRow(row.key, (r) => {
                                  const firstVariant = next?.variants[0];
                                  const qtyInput = r.qtyInput || String(firstVariant?.tiers[0]?.minQty ?? next?.moq ?? "");
                                  return {
                                    ...r,
                                    productId: next?.id ?? null,
                                    variantId: firstVariant?.id ?? null,
                                    qtyInput,
                                    priceInput: tierPriceInput(firstVariant, qtyInput),
                                    priceOverridden: false,
                                  };
                                });
                              }}
                            >
                              <option value="" disabled>
                                เลือกสินค้า
                              </option>
                              {categories.map((category) => (
                                <optgroup key={category} label={category}>
                                  {catalog
                                    .filter((p) => p.category === category)
                                    .map((p) => (
                                      <option key={p.id} value={p.id}>
                                        {p.name}
                                      </option>
                                    ))}
                                </optgroup>
                              ))}
                            </select>
                            <p className={`field__help${showErrors && problems.product ? " is-error" : ""}`}>
                              {showErrors && problems.product ? "เลือกสินค้าและขนาด" : ""}
                            </p>
                          </div>
                          <div className="field">
                            <label className="field__label" htmlFor={`${id}-variant`}>
                              ขนาด / แบบ
                            </label>
                            <select
                              id={`${id}-variant`}
                              className="select"
                              value={row.variantId ?? ""}
                              disabled={!product}
                              onChange={(e) => {
                                const nextVariant = variantById.get(Number(e.target.value));
                                updateRow(row.key, (r) => ({
                                  ...r,
                                  variantId: nextVariant?.id ?? null,
                                  priceInput: r.priceOverridden ? r.priceInput : tierPriceInput(nextVariant, r.qtyInput),
                                }));
                              }}
                            >
                              {!product && <option value="">เลือกสินค้าก่อน</option>}
                              {product &&
                                [...new Set(product.variants.map((v) => v.printMethod ?? ""))].map((method) => {
                                  const options = product.variants
                                    .filter((v) => (v.printMethod ?? "") === method)
                                    .map((v) => (
                                      <option key={v.id} value={v.id}>
                                        {v.detail ? `${v.label} — ${v.detail}` : v.label}
                                      </option>
                                    ));
                                  return method ? (
                                    <optgroup key={method} label={`พิมพ์ระบบ ${method}`}>
                                      {options}
                                    </optgroup>
                                  ) : (
                                    options
                                  );
                                })}
                            </select>
                            <p className="field__help">
                              {product?.leadDays ? `ผลิต ${product.leadDays} วันทำการ` : ""}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="field">
                          <label className="field__label" htmlFor={`${id}-desc`}>
                            รายละเอียด
                          </label>
                          <input
                            id={`${id}-desc`}
                            className="input"
                            value={row.description}
                            placeholder="ค่าออกแบบ, ค่าจัดส่ง, งานพิเศษ"
                            aria-invalid={showErrors && problems.description ? true : undefined}
                            onChange={(e) => updateRow(row.key, (r) => ({ ...r, description: e.target.value }))}
                          />
                          <p className={`field__help${showErrors && problems.description ? " is-error" : ""}`}>
                            {showErrors && problems.description ? "ระบุรายละเอียดรายการ" : ""}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="item__numbers">
                      <div className="field">
                        <label className="field__label" htmlFor={`${id}-qty`}>
                          จำนวน
                        </label>
                        <input
                          id={`${id}-qty`}
                          className="input num"
                          inputMode="numeric"
                          value={row.qtyInput}
                          aria-invalid={showErrors && problems.quantity ? true : undefined}
                          aria-describedby={`${id}-qty-help`}
                          onChange={(e) =>
                            updateRow(row.key, (r) => {
                              const qtyInput = e.target.value;
                              const v = r.variantId ? variantById.get(r.variantId) : undefined;
                              return {
                                ...r,
                                qtyInput,
                                priceInput: r.priceOverridden || !v ? r.priceInput : tierPriceInput(v, qtyInput),
                              };
                            })
                          }
                        />
                        <p id={`${id}-qty-help`} className={`field__help ${qtyHelp.cls}`}>
                          {qtyHelp.text}
                        </p>
                      </div>
                      <div className="field">
                        <label className="field__label" htmlFor={`${id}-unit`}>
                          หน่วย
                        </label>
                        <input
                          id={`${id}-unit`}
                          className="input"
                          value={row.unit}
                          onChange={(e) => updateRow(row.key, (r) => ({ ...r, unit: e.target.value }))}
                        />
                        <p className="field__help" />
                      </div>
                      <div className="field">
                        <label className="field__label" htmlFor={`${id}-price`}>
                          ราคา/หน่วย (บาท)
                        </label>
                        <input
                          id={`${id}-price`}
                          className="input num"
                          inputMode="decimal"
                          value={row.priceInput}
                          aria-invalid={showErrors && problems.price ? true : undefined}
                          onChange={(e) =>
                            updateRow(row.key, (r) => ({ ...r, priceInput: e.target.value, priceOverridden: true }))
                          }
                        />
                        <p className={`field__help${showErrors && problems.price ? " is-error" : ""}`}>
                          {showErrors && problems.price ? (
                            "ใส่ราคา เช่น 1.25"
                          ) : row.kind === "catalog" && row.priceOverridden && tierPrice && tierPrice !== row.priceInput ? (
                            <button
                              type="button"
                              className="tier-reset"
                              onClick={() =>
                                updateRow(row.key, (r) => ({ ...r, priceInput: tierPrice, priceOverridden: false }))
                              }
                            >
                              ใช้ราคาตามขั้น ฿{tierPrice}
                            </button>
                          ) : (
                            ""
                          )}
                        </p>
                      </div>
                      <div className="item__total">
                        <span className="field__label">จำนวนเงิน</span>
                        <strong className="num">฿{formatBaht(line.quantity * line.unitPriceSatang)}</strong>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {rows.length === 0 && !removed && (
              <p className="muted" style={{ fontSize: "var(--text-sm)" }}>
                ยังไม่มีรายการ เพิ่มสินค้าจากแคตตาล็อกหรือรายการอื่น เช่น ค่าออกแบบ
              </p>
            )}

            <div className="items__add">
              <button type="button" className="btn btn--quiet" onClick={addCatalogRow}>
                <Plus size={16} aria-hidden />
                เพิ่มสินค้า
              </button>
              <button type="button" className="btn btn--ghost" onClick={addCustomRow}>
                <PenLine size={16} aria-hidden />
                รายการอื่น
              </button>
              {removed && (
                <button type="button" className="btn btn--ghost" onClick={undoRemove}>
                  <Undo2 size={16} aria-hidden />
                  เลิกลบรายการ
                </button>
              )}
            </div>
          </section>

          <section className="section" aria-labelledby={`${uid}-terms`}>
            <div className="section__head">
              <h2 className="section__title" id={`${uid}-terms`}>
                เงื่อนไข
              </h2>
            </div>
            <div className="grid-fields">
              <div className="field">
                <label className="field__label" htmlFor={`${uid}-issue`}>
                  วันที่ออกเอกสาร
                </label>
                <input
                  id={`${uid}-issue`}
                  type="date"
                  className="input"
                  value={issueDate}
                  onChange={(e) => setIssueDate(e.target.value)}
                />
                <p className="field__help" />
              </div>
              <div className="field">
                <label className="field__label" htmlFor={`${uid}-valid`}>
                  ยืนราคาถึง
                </label>
                <input
                  id={`${uid}-valid`}
                  type="date"
                  className="input"
                  value={validUntil}
                  min={issueDate}
                  aria-invalid={validUntil < issueDate ? true : undefined}
                  onChange={(e) => setValidUntil(e.target.value)}
                />
                <p className={`field__help${validUntil < issueDate ? " is-error" : ""}`}>
                  {validUntil < issueDate ? "ต้องไม่ก่อนวันที่ออกเอกสาร" : ""}
                </p>
              </div>
              <div className="field span-2">
                <label className="field__label" htmlFor={`${uid}-notes`}>
                  หมายเหตุบนใบเสนอราคา
                </label>
                <textarea
                  id={`${uid}-notes`}
                  className="textarea"
                  rows={4}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </div>
          </section>
        </div>

        <aside className="summary" aria-label="สรุปยอด">
          <h2 className="summary__title">สรุปยอด</h2>

          <div className="field">
            <label className="field__label" htmlFor={`${uid}-discount`}>
              ส่วนลด (%)
            </label>
            <input
              id={`${uid}-discount`}
              className="input num"
              inputMode="decimal"
              value={discountInput}
              aria-invalid={!discountValid ? true : undefined}
              onChange={(e) => setDiscountInput(e.target.value)}
            />
            <p className={`field__help${!discountValid ? " is-error" : ""}`}>
              {!discountValid ? "ใส่ตัวเลข 0–100" : ""}
            </p>
          </div>

          {catalogQty >= PROMO_MIN_QTY && discountBps === 0 && (
            <div className="promo">
              <span>
                สั่งรวม {formatQty(catalogQty)} ใบ เข้าเงื่อนไขโปรเปิดร้านบนเว็บไซต์ (ครบ 5,000 ใบ ลดเพิ่ม 8%)
              </span>
              <button
                type="button"
                className="tier-reset"
                style={{ justifySelf: "start" }}
                onClick={() => setDiscountInput(PROMO_DISCOUNT_PERCENT)}
              >
                ใช้ส่วนลด 8%
              </button>
            </div>
          )}

          <fieldset className="field">
            <legend className="field__label" style={{ marginBottom: "var(--space-2xs)" }}>
              ภาษีมูลค่าเพิ่ม
            </legend>
            <div className="segmented">
              {(
                [
                  ["exclusive", "บวก VAT 7%"],
                  ["none", "ไม่คิด VAT"],
                ] as const
              ).map(([value, label]) => (
                <label key={value}>
                  <input
                    type="radio"
                    name={`${uid}-vat`}
                    value={value}
                    checked={vatMode === value}
                    onChange={() => setVatMode(value)}
                  />
                  {label}
                </label>
              ))}
            </div>
          </fieldset>

          <dl className="summary__rows">
            <div className="summary__row">
              <dt>รวมเป็นเงิน</dt>
              <dd className="num">฿{formatBaht(totals.subtotal)}</dd>
            </div>
            {totals.discount > 0 && (
              <div className="summary__row">
                <dt>ส่วนลด {discountInput}%</dt>
                <dd className="num">−฿{formatBaht(totals.discount)}</dd>
              </div>
            )}
            {vatMode === "exclusive" && (
              <div className="summary__row">
                <dt>VAT 7%</dt>
                <dd className="num">฿{formatBaht(totals.vat)}</dd>
              </div>
            )}
          </dl>

          <div className="summary__total">
            <span className="summary__total-label">จำนวนเงินรวมทั้งสิ้น</span>
            <span className="summary__total-value num">฿{formatBaht(totals.total)}</span>
            <span className="summary__words">({bahtText(totals.total)})</span>
          </div>

          <button type="submit" className="btn btn--primary" disabled={pending}>
            {pending ? (
              <>
                <span className="spinner" aria-hidden />
                กำลังบันทึก…
              </>
            ) : (
              submitLabel
            )}
          </button>
          <Link href={initial.id ? `/quotations/${initial.id}` : "/quotations"} className="btn btn--ghost">
            ยกเลิก
          </Link>
        </aside>
      </div>
    </form>
  );
}
