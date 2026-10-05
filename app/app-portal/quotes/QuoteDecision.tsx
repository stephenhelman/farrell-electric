"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatMoney } from "@/lib/app/format";
import { acceptQuoteAction, declineQuoteAction } from "./actions";
import styles from "./QuoteDecision.module.css";

interface Props {
  quoteId: string;
  quoteNumber: number;
  customerName: string;
  /** The SAVED total — accept is disabled while the builder has unsaved edits, so this is what gets accepted. */
  total: number;
  hasUnsavedChanges: boolean;
}

type Decision = "accept" | "decline";

/**
 * Accept / Decline for a saved DRAFT or SENT quote, each behind a confirm
 * step. Accepting spawns the Job and lands the rep on it; declining locks the
 * quote.
 */
export function QuoteDecision({ quoteId, quoteNumber, customerName, total, hasUnsavedChanges }: Props) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [decision, setDecision] = useState<Decision>("accept");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function open(next: Decision) {
    setDecision(next);
    setError(null);
    dialogRef.current?.showModal();
  }

  function confirm() {
    startTransition(async () => {
      try {
        if (decision === "accept") {
          const jobId = await acceptQuoteAction(quoteId);
          router.push(`/jobs/${jobId}`);
        } else {
          await declineQuoteAction(quoteId);
          dialogRef.current?.close();
          router.refresh();
        }
      } catch {
        setError("Something went wrong — nothing was changed. Try again.");
      }
    });
  }

  const accepting = decision === "accept";

  return (
    <>
      <button
        type="button"
        className={styles.accept}
        disabled={hasUnsavedChanges}
        onClick={() => open("accept")}
        title={hasUnsavedChanges ? "Save your changes before accepting." : undefined}
      >
        Accept
      </button>
      <button type="button" className={styles.decline} onClick={() => open("decline")}>
        Decline
      </button>

      <dialog ref={dialogRef} className={styles.dialog} aria-labelledby="decision-title">
        <div className={styles.body}>
          <h2 id="decision-title" className={styles.title}>
            {accepting ? "Accept this quote?" : "Decline this quote?"}
          </h2>
          <p className={styles.summary}>
            Quote #{quoteNumber} &middot; {customerName} &middot; {formatMoney(total)}
          </p>
          <p className={styles.note}>
            {accepting
              ? "This marks the quote accepted, creates the job, and takes you to it to generate the contract."
              : "This marks the quote declined and locks it from further edits."}
          </p>
          {error ? (
            <p role="alert" className={styles.error}>
              {error}
            </p>
          ) : null}
          <div className={styles.actions}>
            <button
              type="button"
              className={styles.cancel}
              disabled={isPending}
              onClick={() => dialogRef.current?.close()}
            >
              Cancel
            </button>
            <button
              type="button"
              className={accepting ? styles.confirmAccept : styles.confirmDecline}
              disabled={isPending}
              onClick={confirm}
            >
              {isPending ? "Working…" : accepting ? "Accept & open job" : "Decline quote"}
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
