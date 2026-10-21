"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { RepoOption } from "@/lib/app/repo/types";
import { formatOptionInputType } from "@/lib/app/catalog/format";
import { OPTION_INPUT_TYPES } from "@/lib/app/catalog/validate";
import { formatMoney } from "@/lib/app/format";
import styles from "../price-book/PriceBookList.module.css";
import { createOptionAction, setOptionActiveAction, updateOptionAction } from "./actions";

interface FormState {
  name: string;
  customerDescription: string;
  inputType: RepoOption["inputType"];
  defaultUnitPrice: string;
  laborPerUnit: string;
}

const EMPTY_FORM: FormState = {
  name: "",
  customerDescription: "",
  inputType: "COUNT",
  defaultUnitPrice: "",
  laborPerUnit: "",
};

function toForm(option: RepoOption): FormState {
  return {
    name: option.name,
    customerDescription: option.customerDescription,
    inputType: option.inputType,
    defaultUnitPrice: option.defaultUnitPrice === null ? "" : String(option.defaultUnitPrice),
    laborPerUnit: option.laborPerUnit === null ? "" : String(option.laborPerUnit),
  };
}

// Blank means "not provided yet" (a TODO(owner) seam), never zero.
function optionalAmount(raw: string): number | null {
  return raw.trim() === "" ? null : Number(raw);
}

function toInput(form: FormState) {
  return {
    name: form.name,
    customerDescription: form.customerDescription,
    inputType: form.inputType,
    defaultUnitPrice: optionalAmount(form.defaultUnitPrice),
    laborPerUnit: optionalAmount(form.laborPerUnit),
  };
}

function OptionForm({
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
        Customer description
        <textarea value={form.customerDescription} onChange={(e) => set("customerDescription", e.target.value)} required />
      </label>
      <label className={styles.field}>
        Input type
        <select value={form.inputType} onChange={(e) => set("inputType", e.target.value as FormState["inputType"])}>
          {OPTION_INPUT_TYPES.map((type) => (
            <option key={type} value={type}>
              {formatOptionInputType(type)}
            </option>
          ))}
        </select>
      </label>
      <div />
      <label className={styles.field}>
        Default unit price (optional)
        <input inputMode="decimal" value={form.defaultUnitPrice} onChange={(e) => set("defaultUnitPrice", e.target.value)} />
      </label>
      <label className={styles.field}>
        Labor per unit (optional)
        <input inputMode="decimal" value={form.laborPerUnit} onChange={(e) => set("laborPerUnit", e.target.value)} />
      </label>
      <div className={`${styles.formNote} ${styles.fieldWide}`}>
        Leave price and labor blank until the owner provides them. Components (the catalog items an option is built
        from) are set up separately.
      </div>

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

export function OptionsList({ options }: { options: RepoOption[] }) {
  const router = useRouter();
  const [hideInactive, setHideInactive] = useState(false);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [rowError, setRowError] = useState<{ id: string; message: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const visible = hideInactive ? options.filter((option) => option.active) : options;

  async function create(form: FormState): Promise<string | null> {
    const result = await createOptionAction(toInput(form));
    if (!result.ok) return result.error;
    setCreating(false);
    router.refresh();
    return null;
  }

  async function update(id: string, form: FormState): Promise<string | null> {
    const result = await updateOptionAction(id, toInput(form));
    if (!result.ok) return result.error;
    setEditingId(null);
    router.refresh();
    return null;
  }

  function toggleActive(option: RepoOption) {
    setRowError(null);
    startTransition(async () => {
      const result = await setOptionActiveAction(option.id, !option.active);
      if (!result.ok) {
        setRowError({ id: option.id, message: result.error });
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
            Add option
          </button>
        ) : null}
      </div>

      {creating ? (
        <OptionForm initial={EMPTY_FORM} submitLabel="Add option" onSubmit={create} onCancel={() => setCreating(false)} />
      ) : null}

      {visible.length === 0 ? (
        <p className={styles.empty}>No options yet.</p>
      ) : (
        <ul className={styles.list}>
          {visible.map((option) => (
            <li key={option.id} className={`${styles.row} ${option.active ? "" : styles.rowInactive}`}>
              <div className={styles.rowHeader}>
                <div className={styles.name}>{option.name}</div>
                <div className={styles.price}>
                  {option.defaultUnitPrice !== null ? formatMoney(option.defaultUnitPrice) : "TODO: pricing"}
                </div>
              </div>
              <div className={styles.meta}>
                {formatOptionInputType(option.inputType)}
                {" · "}
                Labor/unit: {option.laborPerUnit !== null ? formatMoney(option.laborPerUnit) : "TODO: owner-provided"}
              </div>
              <div className={styles.description}>{option.customerDescription}</div>

              {(!option.active || option.components.length === 0) && (
                <div className={styles.flags}>
                  {!option.active ? <span className={`${styles.badge} ${styles.badgeInactive}`}>Inactive</span> : null}
                  {option.components.length === 0 ? (
                    <span className={`${styles.badge} ${styles.badgeIncomplete}`}>No components yet — needs setup</span>
                  ) : null}
                </div>
              )}

              {option.components.length > 0 ? (
                <div className={styles.reviewNotes}>
                  Built from: {option.components.map((c) => `${c.qtyPerUnit}× ${c.catalogItemName}`).join(", ")}
                </div>
              ) : null}

              {editingId === option.id ? (
                <div className={styles.formRow}>
                  <OptionForm
                    key={option.id}
                    initial={toForm(option)}
                    submitLabel="Save changes"
                    onSubmit={(form) => update(option.id, form)}
                    onCancel={() => setEditingId(null)}
                  />
                </div>
              ) : (
                <div className={styles.rowActions}>
                  <button
                    type="button"
                    className={`${styles.button} ${styles.buttonSecondary}`}
                    onClick={() => setEditingId(option.id)}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className={`${styles.button} ${styles.buttonSecondary}`}
                    onClick={() => toggleActive(option)}
                    disabled={isPending}
                  >
                    {option.active ? "Deactivate" : "Reactivate"}
                  </button>
                </div>
              )}
              {rowError?.id === option.id ? <div className={styles.formError}>{rowError.message}</div> : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
