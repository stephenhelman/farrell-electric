"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { DECLINE_REASON_LABELS, declineReasonsFor, type DeclineContext } from "@/lib/app/quotes/decline-reasons";
import type { QuoteDeclineReason } from "@/lib/app/repo/types";
import styles from "./QuoteDialog.module.css";

interface Props {
  open: boolean;
  /** "public" = customer-facing option list; "rep" adds NO_RESPONSE and the notify toggle (default off). */
  context: DeclineContext;
  title?: string;
  /** Resolves to an error message, or null on success. The server re-validates everything. */
  onSubmit: (input: { reason: QuoteDeclineReason; detail: string; notify: boolean }) => Promise<string | null>;
  onClose: () => void;
}

/** The one decline dialog — used by the public quote page and the rep app. */
export function DeclineModal({ open, context, title = "Decline this quote?", onSubmit, onClose }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const [reason, setReason] = useState<QuoteDeclineReason | "">("");
  const [detail, setDetail] = useState("");
  const [notify, setNotify] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      setReason("");
      setDetail("");
      setNotify(false);
      setError(null);
      dialog.showModal();
    }
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const needsDetail = reason === "OTHER";

  function submit() {
    if (!reason) return setError("Choose a reason.");
    if (needsDetail && !detail.trim()) return setError("Tell us a little more for “Other”.");
    setError(null);
    startTransition(async () => {
      const message = await onSubmit({ reason, detail: detail.trim(), notify: context === "rep" && notify });
      if (message) setError(message);
    });
  }

  return (
    <dialog ref={ref} className={styles.dialog} aria-labelledby="decline-title" onCancel={onClose}>
      <div className={styles.body}>
        <h2 id="decline-title" className={styles.title}>
          {title}
        </h2>
        <fieldset className={styles.reasons}>
          <legend className={styles.note}>Reason</legend>
          {declineReasonsFor(context).map((value) => (
            <label key={value} className={styles.check}>
              <input type="radio" name="decline-reason" checked={reason === value} onChange={() => setReason(value)} />
              <span>{DECLINE_REASON_LABELS[value]}</span>
            </label>
          ))}
        </fieldset>
        <label className={styles.field}>
          <span className={styles.note}>{needsDetail ? "Details (required)" : "Details (optional)"}</span>
          <textarea
            className={styles.textarea}
            rows={3}
            maxLength={1000}
            value={detail}
            required={needsDetail}
            onChange={(event) => setDetail(event.target.value)}
          />
        </label>
        {context === "rep" ? (
          <label className={styles.check}>
            <input type="checkbox" checked={notify} onChange={(event) => setNotify(event.target.checked)} />
            <span>Notify customer</span>
          </label>
        ) : null}
        {error ? (
          <p role="alert" className={styles.error}>
            {error}
          </p>
        ) : null}
        <div className={styles.actions}>
          <button type="button" className={styles.cancel} disabled={isPending} onClick={onClose}>
            Cancel
          </button>
          <button type="button" className={styles.confirmDanger} disabled={isPending} onClick={submit}>
            {isPending ? "Working…" : "Decline quote"}
          </button>
        </div>
      </div>
    </dialog>
  );
}
