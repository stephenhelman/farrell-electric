"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatMoney } from "@/lib/app/format";
import { DeclineModal } from "@/components/app/DeclineModal";
import { NotifyCustomerDialog } from "@/components/app/NotifyCustomerDialog";
import { acceptQuoteAction, createJobAction, declineQuoteAction, expireQuoteAction } from "./actions";
import styles from "./QuoteDecision.module.css";

/** The job page shows the SOW warning banner when sent here with ?sow=missing. */
function jobHref({ jobId, warning }: { jobId: string; warning: string | null }): string {
  return `/jobs/${jobId}${warning ? "?sow=missing" : ""}`;
}

interface Props {
  quoteId: string;
  quoteNumber: number;
  customerName: string;
  status: "DRAFT" | "SENT" | "ACCEPTED";
  /** The SAVED total — accept is disabled while the builder has unsaved edits, so this is what gets accepted. */
  total: number;
  hasUnsavedChanges: boolean;
}

/**
 * Rep actions on a saved quote. DRAFT/SENT: Accept (marks accepted + creates
 * the job), Decline (reason modal, notify default off), and — once SENT —
 * Mark expired (notify default on). ACCEPTED: "Open job", which creates the
 * Job if the customer accepted from the public page and none exists yet.
 */
export function QuoteDecision({ quoteId, quoteNumber, customerName, status, total, hasUnsavedChanges }: Props) {
  const router = useRouter();
  const acceptRef = useRef<HTMLDialogElement>(null);
  const [declineOpen, setDeclineOpen] = useState(false);
  const [expireOpen, setExpireOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function accept() {
    setError(null);
    startTransition(async () => {
      try {
        router.push(jobHref(await acceptQuoteAction(quoteId)));
      } catch {
        setError("Something went wrong — nothing was changed. Try again.");
      }
    });
  }

  function openJob() {
    setError(null);
    startTransition(async () => {
      try {
        router.push(jobHref(await createJobAction(quoteId)));
      } catch {
        setError("Couldn't open the job. Try again.");
      }
    });
  }

  function expire(notify: boolean) {
    startTransition(async () => {
      const result = await expireQuoteAction(quoteId, notify);
      if (result.ok) {
        setExpireOpen(false);
        router.refresh();
      } else {
        setError(result.error);
        setExpireOpen(false);
      }
    });
  }

  if (status === "ACCEPTED") {
    return (
      <>
        <button type="button" className={styles.accept} disabled={isPending} aria-busy={isPending} onClick={openJob}>
          {isPending ? (
            <>
              <span className={styles.spinner} aria-hidden="true" />
              Creating job…
            </>
          ) : (
            "Open job"
          )}
        </button>
        <span role="status" className={styles.srOnly}>{isPending ? "Creating job, generating the scope of work…" : ""}</span>
        {error ? <span role="alert" className={styles.error}>{error}</span> : null}
      </>
    );
  }

  return (
    <>
      <button
        type="button"
        className={styles.accept}
        disabled={hasUnsavedChanges}
        onClick={() => {
          setError(null);
          acceptRef.current?.showModal();
        }}
        title={hasUnsavedChanges ? "Save your changes before accepting." : undefined}
      >
        Accept
      </button>
      <button type="button" className={styles.decline} onClick={() => setDeclineOpen(true)}>
        Decline
      </button>
      {status === "SENT" ? (
        <button
          type="button"
          className={styles.cancel}
          onClick={() => {
            setError(null);
            setExpireOpen(true);
          }}
        >
          Mark expired
        </button>
      ) : null}

      <dialog ref={acceptRef} className={styles.dialog} aria-labelledby="decision-title">
        <div className={styles.body}>
          <h2 id="decision-title" className={styles.title}>
            Accept this quote?
          </h2>
          <p className={styles.summary}>
            Quote #{quoteNumber} &middot; {customerName} &middot; {formatMoney(total)}
          </p>
          <p className={styles.note}>
            This marks the quote accepted, creates the job, and takes you to it to generate the contract.
          </p>
          {error ? (
            <p role="alert" className={styles.error}>
              {error}
            </p>
          ) : null}
          <div className={styles.actions}>
            <button type="button" className={styles.cancel} disabled={isPending} onClick={() => acceptRef.current?.close()}>
              Cancel
            </button>
            <button type="button" className={styles.confirmAccept} disabled={isPending} aria-busy={isPending} onClick={accept}>
              {isPending ? (
                <>
                  <span className={styles.spinner} aria-hidden="true" />
                  Creating job…
                </>
              ) : (
                "Accept & open job"
              )}
            </button>
          </div>
        </div>
      </dialog>

      <DeclineModal
        open={declineOpen}
        context="rep"
        onClose={() => setDeclineOpen(false)}
        onSubmit={async ({ reason, detail, notify }) => {
          const result = await declineQuoteAction(quoteId, reason, detail, notify);
          if (!result.ok) return result.error;
          setDeclineOpen(false);
          router.refresh();
          return null;
        }}
      />

      <NotifyCustomerDialog
        open={expireOpen}
        title="Mark this quote expired?"
        defaultNotify
        confirmLabel="Mark expired"
        pending={isPending}
        onConfirm={expire}
        onCancel={() => setExpireOpen(false)}
      />
      {error && !acceptRef.current?.open ? <span role="alert" className={styles.error}>{error}</span> : null}
    </>
  );
}
