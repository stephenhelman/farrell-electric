"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { RepoCatalogItem } from "@/lib/app/repo/types";
import { formatCalcType, formatUnitOfMeasure } from "@/lib/app/catalog/format";
import { CALC_TYPES, UNITS_OF_MEASURE } from "@/lib/app/catalog/validate";
import { formatMoney } from "@/lib/app/format";
import { createCatalogItemAction, setCatalogItemActiveAction, updateCatalogItemAction } from "./actions";
import styles from "./PriceBookList.module.css";

interface FormState {
  name: string;
  description: string;
  unitOfMeasure: RepoCatalogItem["unitOfMeasure"];
  calcType: RepoCatalogItem["calcType"];
  wattage: string;
  price: string;
  cost: string;
  taxable: boolean;
  isPlaceholder: boolean;
  isSuspectedDuplicate: boolean;
  needsReview: boolean;
  reviewNotes: string;
}

// A new item deliberately starts with no price/cost — nothing is guessed.
const EMPTY_FORM: FormState = {
  name: "",
  description: "",
  unitOfMeasure: "EACH",
  calcType: "OTHER",
  wattage: "",
  price: "",
  cost: "",
  taxable: true,
  isPlaceholder: false,
  isSuspectedDuplicate: false,
  needsReview: false,
  reviewNotes: "",
};

function toForm(item: RepoCatalogItem): FormState {
  return {
    name: item.name,
    description: item.description ?? "",
    unitOfMeasure: item.unitOfMeasure,
    calcType: item.calcType,
    wattage: item.wattage === null ? "" : String(item.wattage),
    price: String(item.price),
    cost: String(item.cost),
    taxable: item.taxable,
    isPlaceholder: item.isPlaceholder,
    isSuspectedDuplicate: item.isSuspectedDuplicate,
    needsReview: item.needsReview,
    reviewNotes: item.reviewNotes ?? "",
  };
}

function parseAmount(raw: string): number {
  return raw.trim() === "" ? Number.NaN : Number(raw);
}

function marginLabel(price: string, cost: string): string {
  const p = parseAmount(price);
  const c = parseAmount(cost);
  if (!Number.isFinite(p) || !Number.isFinite(c)) return "—";
  if (p === 0) return "n/a";
  return `${formatMoney(p - c)} (${(((p - c) / p) * 100).toFixed(1)}%)`;
}

function ItemForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial: FormState;
  submitLabel: string;
  onSubmit: (form: FormState) => Promise<string | null>;
  onCancel: () => void;
}) {
  const [form, setForm] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const failure = await onSubmit(form);
      if (failure) setError(failure);
    });
  }

  return (
    <form className={styles.form} onSubmit={submit}>
      <label className={`${styles.field} ${styles.fieldWide}`}>
        Name
        <input value={form.name} onChange={(e) => set("name", e.target.value)} required />
      </label>
      <label className={`${styles.field} ${styles.fieldWide}`}>
        Description
        <textarea value={form.description} onChange={(e) => set("description", e.target.value)} />
      </label>
      <label className={styles.field}>
        Category
        <select value={form.calcType} onChange={(e) => set("calcType", e.target.value as FormState["calcType"])}>
          {CALC_TYPES.map((type) => (
            <option key={type} value={type}>
              {formatCalcType(type)}
            </option>
          ))}
        </select>
      </label>
      <label className={styles.field}>
        Unit
        <select
          value={form.unitOfMeasure}
          onChange={(e) => set("unitOfMeasure", e.target.value as FormState["unitOfMeasure"])}
        >
          {UNITS_OF_MEASURE.map((unit) => (
            <option key={unit} value={unit}>
              {formatUnitOfMeasure(unit)}
            </option>
          ))}
        </select>
      </label>
      <label className={styles.field}>
        Price
        <input inputMode="decimal" value={form.price} onChange={(e) => set("price", e.target.value)} required />
      </label>
      <label className={styles.field}>
        Cost (internal)
        <input inputMode="decimal" value={form.cost} onChange={(e) => set("cost", e.target.value)} required />
      </label>
      <label className={styles.field}>
        Wattage (optional)
        <input inputMode="decimal" value={form.wattage} onChange={(e) => set("wattage", e.target.value)} />
      </label>
      <div className={styles.field}>
        Margin (internal)
        <div className={styles.formNote}>{marginLabel(form.price, form.cost)}</div>
      </div>

      <div className={`${styles.checks} ${styles.fieldWide}`}>
        <label className={styles.filterCheck}>
          <input type="checkbox" checked={form.taxable} onChange={(e) => set("taxable", e.target.checked)} />
          Taxable
        </label>
        <label className={styles.filterCheck}>
          <input type="checkbox" checked={form.isPlaceholder} onChange={(e) => set("isPlaceholder", e.target.checked)} />
          Placeholder price
        </label>
        <label className={styles.filterCheck}>
          <input type="checkbox" checked={form.needsReview} onChange={(e) => set("needsReview", e.target.checked)} />
          Needs review
        </label>
        <label className={styles.filterCheck}>
          <input
            type="checkbox"
            checked={form.isSuspectedDuplicate}
            onChange={(e) => set("isSuspectedDuplicate", e.target.checked)}
          />
          Suspected duplicate
        </label>
      </div>
      <label className={`${styles.field} ${styles.fieldWide}`}>
        Review notes
        <textarea value={form.reviewNotes} onChange={(e) => set("reviewNotes", e.target.value)} />
      </label>

      {error ? <div className={`${styles.formError} ${styles.fieldWide}`}>{error}</div> : null}
      <div className={`${styles.rowActions} ${styles.fieldWide}`}>
        <button type="submit" className={styles.button} disabled={isPending}>
          {isPending ? "Saving…" : submitLabel}
        </button>
        <button type="button" className={`${styles.button} ${styles.buttonSecondary}`} onClick={onCancel} disabled={isPending}>
          Cancel
        </button>
      </div>
    </form>
  );
}

export function PriceBookList({ items }: { items: RepoCatalogItem[] }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [hideInactive, setHideInactive] = useState(false);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [rowError, setRowError] = useState<{ id: string; message: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const categories = useMemo(() => {
    const unique = new Set(items.map((item) => formatCalcType(item.calcType)));
    return ["All", ...Array.from(unique).sort()];
  }, [items]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return items.filter((item) => {
      if (hideInactive && !item.active) return false;
      const matchesCategory = category === "All" || formatCalcType(item.calcType) === category;
      const haystack = `${item.name} ${item.description ?? ""}`.toLowerCase();
      const matchesSearch = query === "" || haystack.includes(query);
      return matchesCategory && matchesSearch;
    });
  }, [items, search, category, hideInactive]);

  function toInput(form: FormState) {
    return {
      name: form.name,
      description: form.description,
      unitOfMeasure: form.unitOfMeasure,
      calcType: form.calcType,
      wattage: form.wattage.trim() === "" ? null : Number(form.wattage),
      price: parseAmount(form.price),
      cost: parseAmount(form.cost),
      taxable: form.taxable,
      isPlaceholder: form.isPlaceholder,
      isSuspectedDuplicate: form.isSuspectedDuplicate,
      needsReview: form.needsReview,
      reviewNotes: form.reviewNotes,
    };
  }

  async function create(form: FormState): Promise<string | null> {
    // description/reviewNotes blank strings are normalised to null server-side.
    const result = await createCatalogItemAction({ ...toInput(form), description: form.description || null, reviewNotes: form.reviewNotes || null });
    if (!result.ok) return result.error;
    setCreating(false);
    router.refresh();
    return null;
  }

  async function update(id: string, form: FormState): Promise<string | null> {
    const result = await updateCatalogItemAction(id, { ...toInput(form), description: form.description || null, reviewNotes: form.reviewNotes || null });
    if (!result.ok) return result.error;
    setEditingId(null);
    router.refresh();
    return null;
  }

  function toggleActive(item: RepoCatalogItem) {
    setRowError(null);
    startTransition(async () => {
      const result = await setCatalogItemActiveAction(item.id, !item.active);
      if (!result.ok) {
        setRowError({ id: item.id, message: result.error });
        return;
      }
      router.refresh();
    });
  }

  return (
    <div>
      <div className={styles.headerRow}>
        <label className={styles.filterCheck}>
          <input type="checkbox" checked={hideInactive} onChange={(e) => setHideInactive(e.target.checked)} />
          Hide inactive
        </label>
        {!creating ? (
          <button type="button" className={styles.button} onClick={() => setCreating(true)}>
            Add item
          </button>
        ) : null}
      </div>

      {creating ? (
        <ItemForm initial={EMPTY_FORM} submitLabel="Add item" onSubmit={create} onCancel={() => setCreating(false)} />
      ) : null}

      <div className={styles.toolbar}>
        <input
          className={styles.search}
          placeholder="Search items..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <select
          className={styles.select}
          value={category}
          onChange={(event) => setCategory(event.target.value)}
        >
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <p className={styles.empty}>No items match.</p>
      ) : (
        <ul className={styles.list}>
          {filtered.map((item) => (
            <li key={item.id} className={`${styles.row} ${item.active ? "" : styles.rowInactive}`}>
              <div className={styles.rowHeader}>
                <div className={styles.name}>{item.name}</div>
                <div className={styles.price}>{formatMoney(item.price)}</div>
              </div>
              <div className={styles.meta}>
                {formatCalcType(item.calcType)} &middot; {formatUnitOfMeasure(item.unitOfMeasure)}
                {item.wattage !== null ? ` · ${item.wattage}W` : ""}
              </div>
              {item.description ? <div className={styles.description}>{item.description}</div> : null}

              {(!item.active || item.needsReview || item.isSuspectedDuplicate || item.isPlaceholder) && (
                <div className={styles.flags}>
                  {!item.active ? <span className={`${styles.badge} ${styles.badgeInactive}`}>Inactive</span> : null}
                  {item.isSuspectedDuplicate ? (
                    <span className={`${styles.badge} ${styles.badgeDuplicate}`}>Suspected duplicate</span>
                  ) : null}
                  {item.needsReview ? (
                    <span className={`${styles.badge} ${styles.badgeReview}`}>Needs review</span>
                  ) : null}
                  {item.isPlaceholder ? (
                    <span className={`${styles.badge} ${styles.badgePlaceholder}`}>Placeholder price</span>
                  ) : null}
                </div>
              )}

              {item.reviewNotes ? <div className={styles.reviewNotes}>{item.reviewNotes}</div> : null}

              {editingId === item.id ? (
                <div className={styles.formRow}>
                  <ItemForm
                    key={item.id}
                    initial={toForm(item)}
                    submitLabel="Save changes"
                    onSubmit={(form) => update(item.id, form)}
                    onCancel={() => setEditingId(null)}
                  />
                </div>
              ) : (
                <div className={styles.rowActions}>
                  <button
                    type="button"
                    className={`${styles.button} ${styles.buttonSecondary}`}
                    onClick={() => setEditingId(item.id)}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className={`${styles.button} ${styles.buttonSecondary}`}
                    onClick={() => toggleActive(item)}
                    disabled={isPending}
                  >
                    {item.active ? "Deactivate" : "Reactivate"}
                  </button>
                </div>
              )}
              {rowError?.id === item.id ? <div className={styles.formError}>{rowError.message}</div> : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
