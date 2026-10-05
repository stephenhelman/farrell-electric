"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateActualCostAction } from "../actions";
import styles from "./ActualCostForm.module.css";

/** Rep-entered true cost — INTERNAL. Feeds the margin shown in the financials box. */
export function ActualCostForm({ jobId, initial }: { jobId: string; initial: number | null }) {
  const router = useRouter();
  const [value, setValue] = useState(initial === null ? "" : String(initial));
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function save(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = value.trim();
    const parsed = trimmed === "" ? null : Number(trimmed);

    startTransition(async () => {
      const result = await updateActualCostAction(jobId, parsed);
      if (result.ok) {
        setError(null);
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <form className={styles.form} onSubmit={save}>
      <div className={styles.row}>
        <label htmlFor="actual-cost" className={styles.label}>
          Actual cost
        </label>
        <input
          id="actual-cost"
          className={styles.input}
          type="number"
          inputMode="decimal"
          min="0"
          step="0.01"
          placeholder="Not entered"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          disabled={isPending}
        />
        <button type="submit" className={styles.save} disabled={isPending}>
          {isPending ? "Saving…" : "Save"}
        </button>
      </div>
      {error ? (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      ) : null}
    </form>
  );
}
