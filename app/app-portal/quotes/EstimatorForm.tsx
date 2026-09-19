"use client";

import { useMemo, useState } from "react";
import type { RepoCatalogItem, RepoOption } from "@/lib/app/repo/types";
import { formatOptionInputType } from "@/lib/app/catalog/format";
import { formatMoney } from "@/lib/app/format";
import { estimateAutoSizing } from "@/lib/app/estimator/auto-size";
import { expandSelectionsToLineItems, type EstimatorSelection } from "@/lib/app/estimator/expand-options";
import { QuoteBuilder, type DraftLineItem } from "./QuoteBuilder";
import styles from "./EstimatorForm.module.css";

export function EstimatorForm({
  options,
  catalogItems,
}: {
  options: RepoOption[];
  catalogItems: RepoCatalogItem[];
}) {
  const activeOptions = useMemo(() => options.filter((option) => option.active), [options]);
  const [values, setValues] = useState<Record<string, number>>({});
  const [reviewLineItems, setReviewLineItems] = useState<DraftLineItem[] | null>(null);

  const selections: EstimatorSelection[] = activeOptions.map((option) => ({
    optionId: option.id,
    value: values[option.id] ?? 0,
  }));

  const autoSizing = estimateAutoSizing(selections, activeOptions);
  const previewLineItems = useMemo(
    () => expandSelectionsToLineItems(selections, activeOptions),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [values, activeOptions],
  );
  const previewTotal = previewLineItems.reduce((sum, item) => sum + item.qty * item.unitPrice, 0);

  function setValue(optionId: string, value: number) {
    setValues((current) => ({ ...current, [optionId]: value }));
  }

  function buildQuote() {
    setReviewLineItems(
      previewLineItems.map((item, index) => ({ key: `estimate-${index}-${Date.now()}`, ...item })),
    );
  }

  if (reviewLineItems !== null) {
    return <QuoteBuilder catalogItems={catalogItems} initialQuote={null} initialLineItems={reviewLineItems} />;
  }

  return (
    <div>
      <div className={styles.header}>
        <div>
          <div className={styles.eyebrow}>Guided Estimator</div>
          <h1 className={styles.heading}>New Estimate</h1>
        </div>
      </div>

      {activeOptions.length === 0 ? (
        <p className={styles.empty}>No options available yet — add some on the Options page.</p>
      ) : (
        <div className={styles.card}>
          <h3 className={styles.cardTitle}>Answer what applies</h3>
          <div className={styles.optionList}>
            {activeOptions.map((option) => (
              <div key={option.id} className={styles.optionRow}>
                <div className={styles.optionInfo}>
                  <div className={styles.optionName}>{option.name}</div>
                  <div className={styles.optionMeta}>{formatOptionInputType(option.inputType)}</div>
                </div>
                {option.inputType === "BOOLEAN" ? (
                  <label className={styles.checkboxField}>
                    <input
                      type="checkbox"
                      checked={(values[option.id] ?? 0) > 0}
                      onChange={(e) => setValue(option.id, e.target.checked ? 1 : 0)}
                    />
                    Include
                  </label>
                ) : (
                  <input
                    type="number"
                    min={0}
                    step={option.inputType === "LINEAR_FT" ? 1 : 1}
                    value={values[option.id] ?? 0}
                    onChange={(e) => setValue(option.id, Math.max(0, Number(e.target.value) || 0))}
                    className={styles.numberField}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className={styles.card}>
        <h3 className={styles.cardTitle}>Auto-Sizing (preview only — not yet applied)</h3>
        <p className={styles.seamNote}>{autoSizing.transformerNote}</p>
        <p className={styles.seamNote}>{autoSizing.wireNote}</p>
        <p className={styles.seamNote}>{autoSizing.laborNote}</p>
      </div>

      <div className={styles.card}>
        <div className={styles.previewHeader}>
          <h3 className={styles.cardTitle}>Preview</h3>
          <div className={styles.previewTotal}>{formatMoney(previewTotal)}</div>
        </div>
        {previewLineItems.length === 0 ? (
          <p className={styles.empty}>Answer the form above to build line items.</p>
        ) : (
          <ul className={styles.previewList}>
            {previewLineItems.map((item, index) => (
              <li key={index} className={styles.previewItem}>
                <span>
                  {item.qty}&times; {item.name}
                </span>
                <span>{formatMoney(item.qty * item.unitPrice)}</span>
              </li>
            ))}
          </ul>
        )}
        <button
          type="button"
          className={styles.btnPrimary}
          disabled={previewLineItems.length === 0}
          onClick={buildQuote}
        >
          Build Quote
        </button>
      </div>
    </div>
  );
}
