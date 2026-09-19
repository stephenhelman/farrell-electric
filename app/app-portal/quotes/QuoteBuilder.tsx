"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { RepoCatalogItem, RepoQuoteDetail } from "@/lib/app/repo/types";
import { calcQuoteTotals } from "@/lib/app/quotes/calc";
import { generateScopeOfWork } from "@/lib/app/quotes/scope-of-work";
import { formatMoney } from "@/lib/app/format";
import { CatalogPicker } from "./CatalogPicker";
import { saveQuoteAction } from "./actions";
import styles from "./QuoteBuilder.module.css";

export interface DraftLineItem {
  key: string;
  catalogItemId: string | null;
  name: string;
  description: string | null;
  qty: number;
  unitPrice: number;
  cost: number;
  taxable: boolean;
}

function toDraftLineItems(quote: RepoQuoteDetail | null): DraftLineItem[] {
  if (!quote) return [];
  return quote.lineItems.map((item) => ({ key: item.id, ...item }));
}

export function QuoteBuilder({
  catalogItems,
  initialQuote,
  initialLineItems,
}: {
  catalogItems: RepoCatalogItem[];
  initialQuote: RepoQuoteDetail | null;
  /** Prefill from the guided estimator (Task 7) — ignored once initialQuote is set. */
  initialLineItems?: DraftLineItem[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [customerName, setCustomerName] = useState(initialQuote?.customerName ?? "");
  const [customerPhone, setCustomerPhone] = useState(initialQuote?.customerPhone ?? "");
  const [customerEmail, setCustomerEmail] = useState(initialQuote?.customerEmail ?? "");
  const [customerAddress, setCustomerAddress] = useState(initialQuote?.customerAddress ?? "");
  const [message, setMessage] = useState(
    initialQuote?.message ?? "Thank you for the opportunity to design your outdoor lighting system.",
  );
  const [notes, setNotes] = useState(initialQuote?.notes ?? "");
  const [discount, setDiscount] = useState(initialQuote?.discount ?? 0);
  const [lineItems, setLineItems] = useState<DraftLineItem[]>(() =>
    initialQuote ? toDraftLineItems(initialQuote) : (initialLineItems ?? []),
  );
  const [scopeOfWork, setScopeOfWork] = useState(
    initialQuote?.scopeOfWork || generateScopeOfWork(initialLineItems ?? []),
  );

  const totals = useMemo(() => calcQuoteTotals(lineItems, discount), [lineItems, discount]);
  const sharePath = initialQuote?.publicToken ? `/q/${initialQuote.publicToken}` : null;
  const invoicePath =
    initialQuote?.status === "ACCEPTED" && initialQuote.publicToken ? `${sharePath}/invoice` : null;

  const isLocked = initialQuote?.status === "ACCEPTED" || initialQuote?.status === "DECLINED";

  function addItem(item: RepoCatalogItem) {
    setLineItems((current) => {
      const existing = current.find((line) => line.catalogItemId === item.id);
      if (existing) {
        return current.map((line) =>
          line.catalogItemId === item.id ? { ...line, qty: line.qty + 1 } : line,
        );
      }
      return [
        ...current,
        {
          key: `${item.id}-${Date.now()}`,
          catalogItemId: item.id,
          name: item.name,
          description: item.description,
          qty: 1,
          unitPrice: item.price,
          cost: item.cost,
          taxable: item.taxable,
        },
      ];
    });
  }

  function updateItem(key: string, patch: Partial<Pick<DraftLineItem, "qty" | "unitPrice">>) {
    setLineItems((current) => current.map((line) => (line.key === key ? { ...line, ...patch } : line)));
  }

  function removeItem(key: string) {
    setLineItems((current) => current.filter((line) => line.key !== key));
  }

  function save(status: "DRAFT" | "SENT") {
    setError(null);

    if (!customerName.trim()) {
      setError("Add a customer name.");
      return;
    }
    if (lineItems.length === 0) {
      setError("Add at least one item.");
      return;
    }

    startTransition(async () => {
      const result = await saveQuoteAction({
        id: initialQuote?.id,
        status,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        customerEmail: customerEmail.trim(),
        customerAddress: customerAddress.trim(),
        message,
        notes,
        discount,
        scopeOfWork,
        lineItems: lineItems.map((line) => ({
          catalogItemId: line.catalogItemId,
          name: line.name,
          description: line.description,
          qty: line.qty,
          unitPrice: line.unitPrice,
          cost: line.cost,
          taxable: line.taxable,
        })),
      });
      router.push(`/quotes/${result.id}`);
      router.refresh();
    });
  }

  return (
    <div>
      <div className={styles.header}>
        <div>
          <div className={styles.eyebrow}>Quote</div>
          <h1 className={styles.heading}>{initialQuote ? `Quote #${initialQuote.number}` : "New Quote"}</h1>
        </div>
        <div className={styles.headerActions}>
          <button type="button" className={styles.btn} disabled={isPending || isLocked} onClick={() => save("DRAFT")}>
            Save
          </button>
          <button
            type="button"
            className={styles.btnPrimary}
            disabled={isPending || isLocked}
            onClick={() => save("SENT")}
          >
            Mark Sent
          </button>
        </div>
      </div>

      {isLocked ? (
        <p className={styles.lockedNotice}>
          This quote is {initialQuote?.status.toLowerCase()} and can no longer be edited here.
        </p>
      ) : null}
      {error ? <p className={styles.error}>{error}</p> : null}
      {sharePath ? (
        <p className={styles.lockedNotice}>
          Customer link: <a href={sharePath}>{sharePath}</a>
        </p>
      ) : null}
      {invoicePath ? (
        <div className={styles.lockedNotice}>
          <p>
            Invoice link: <a href={invoicePath}>{invoicePath}</a>
          </p>
          <p style={{ marginTop: "var(--space-2)", marginBottom: 0 }}>
            Payment (Stripe) and automatic delivery (GHL) aren&apos;t built yet — collect payment and share this
            link manually for now.
          </p>
        </div>
      ) : null}

      <div className={styles.card}>
        <div className={styles.grid2}>
          <div className={styles.field}>
            <label htmlFor="customerName">Name</label>
            <input
              id="customerName"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              disabled={isLocked}
            />
          </div>
          <div className={styles.field}>
            <label htmlFor="customerPhone">Phone</label>
            <input
              id="customerPhone"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              disabled={isLocked}
            />
          </div>
          <div className={styles.field}>
            <label htmlFor="customerEmail">Email</label>
            <input
              id="customerEmail"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
              disabled={isLocked}
            />
          </div>
          <div className={styles.field}>
            <label htmlFor="customerAddress">Address</label>
            <input
              id="customerAddress"
              value={customerAddress}
              onChange={(e) => setCustomerAddress(e.target.value)}
              disabled={isLocked}
            />
          </div>
        </div>
        <div className={styles.field}>
          <label htmlFor="message">Customer Message</label>
          <textarea id="message" value={message} onChange={(e) => setMessage(e.target.value)} disabled={isLocked} />
        </div>
      </div>

      {!isLocked && (
        <div className={styles.card}>
          <h3 className={styles.cardTitle}>Add Products &amp; Services</h3>
          <CatalogPicker items={catalogItems} onAdd={addItem} />
        </div>
      )}

      <div className={styles.card}>
        <h3 className={styles.cardTitle}>Quote Items</h3>
        {lineItems.length === 0 ? (
          <p className={styles.empty}>Tap items above to add them.</p>
        ) : (
          <div className={styles.items}>
            {lineItems.map((line) => (
              <div key={line.key} className={styles.item}>
                <div>
                  <div className={styles.itemName}>{line.name}</div>
                  {line.description ? <div className={styles.itemDesc}>{line.description}</div> : null}
                </div>
                <input
                  type="number"
                  min={1}
                  value={line.qty}
                  disabled={isLocked}
                  onChange={(e) => updateItem(line.key, { qty: Math.max(1, Number(e.target.value) || 1) })}
                />
                <input
                  type="number"
                  step="0.01"
                  value={line.unitPrice}
                  disabled={isLocked}
                  onChange={(e) => updateItem(line.key, { unitPrice: Number(e.target.value) || 0 })}
                />
                <button
                  type="button"
                  className={styles.remove}
                  disabled={isLocked}
                  onClick={() => removeItem(line.key)}
                >
                  &times;
                </button>
              </div>
            ))}
          </div>
        )}

        <div className={styles.totals}>
          <div className={styles.sumRow}>
            <span>Subtotal</span>
            <strong>{formatMoney(totals.subtotal)}</strong>
          </div>
          <div className={styles.sumRow}>
            <span>Discount</span>
            <input
              type="number"
              value={discount}
              disabled={isLocked}
              onChange={(e) => setDiscount(Number(e.target.value) || 0)}
              className={styles.discountInput}
            />
          </div>
          <div className={`${styles.sumRow} ${styles.sumRowTotal}`}>
            <span>Total</span>
            <span>{formatMoney(totals.total)}</span>
          </div>
        </div>

        <div className={styles.internal}>
          <div className={styles.internalLabel}>Internal Only</div>
          <div className={styles.internalGrid}>
            <div>
              <span className={styles.internalMetricLabel}>Cost</span>
              <strong>{formatMoney(totals.cost)}</strong>
            </div>
            <div>
              <span className={styles.internalMetricLabel}>Profit</span>
              <strong>{formatMoney(totals.profit)}</strong>
            </div>
            <div>
              <span className={styles.internalMetricLabel}>Margin</span>
              <strong>{totals.margin.toFixed(1)}%</strong>
            </div>
          </div>
        </div>

        <div className={styles.field} style={{ marginTop: "1rem" }}>
          <label htmlFor="notes">Internal Notes</label>
          <textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} disabled={isLocked} />
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.header} style={{ marginBottom: "var(--space-3)" }}>
          <h3 className={styles.cardTitle}>Scope of Work</h3>
          <button
            type="button"
            className={styles.btn}
            disabled={isLocked}
            onClick={() => setScopeOfWork(generateScopeOfWork(lineItems))}
          >
            Regenerate from items
          </button>
        </div>
        <div className={styles.field}>
          <label htmlFor="scopeOfWork">Customer-facing scope (editable)</label>
          <textarea
            id="scopeOfWork"
            value={scopeOfWork}
            onChange={(e) => setScopeOfWork(e.target.value)}
            disabled={isLocked}
            style={{ minHeight: "160px" }}
          />
        </div>
      </div>
    </div>
  );
}
