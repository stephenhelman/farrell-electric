"use client";

import { useRef, useState, useTransition } from "react";
import { sendPaymentRequestAction } from "../actions";
import { formatMoney } from "@/lib/app/format";
// Shares the Record Payment dialog styling — same modal pattern, same page.
import styles from "./RecordPayment.module.css";

interface Props {
  jobId: string;
  /** What a request would send right now; null when nothing is owed. */
  due: { kind: "deposit" | "balance"; amount: number } | null;
}

/** Rep (re)sends the customer's pay link. The server re-checks what's owed — this is only the preview. */
export function SendPaymentRequest({ jobId, due }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [sentNote, setSentNote] = useState<string | null>(null);

  function open() {
    setError(null);
    setSentNote(null);
    dialogRef.current?.showModal();
  }

  function close() {
    dialogRef.current?.close();
  }

  function send() {
    startTransition(async () => {
      const result = await sendPaymentRequestAction(jobId);
      if (!result.ok) {
        setError(result.error);
      } else if (result.sent) {
        setError(null);
        setSentNote(`Sent a ${result.kind} request for ${formatMoney(result.amount)}.`);
      } else {
        setError("Nothing is due, so nothing was sent.");
      }
    });
  }

  const label = due ? `${due.kind === "deposit" ? "deposit" : "balance"} request for ${formatMoney(due.amount)}` : null;

  return (
    <>
      <button type="button" className={styles.trigger} onClick={open} disabled={!due} title={due ? undefined : "Nothing is due"}>
        Send payment request
      </button>

      <dialog ref={dialogRef} className={styles.dialog} aria-labelledby="request-title">
        <div className={styles.form}>
          <h2 id="request-title" className={styles.title}>
            Send payment request
          </h2>
          <p>
            {label
              ? `This sends the customer a ${label}, with a link to their payment page.`
              : "Nothing is due right now."}
          </p>

          {sentNote ? <p role="status">{sentNote}</p> : null}
          {error ? (
            <p role="alert" className={styles.error}>
              {error}
            </p>
          ) : null}

          <div className={styles.actions}>
            <button type="button" className={styles.cancel} onClick={close} disabled={isPending}>
              {sentNote ? "Close" : "Cancel"}
            </button>
            {sentNote ? null : (
              <button type="button" className={styles.confirm} onClick={send} disabled={isPending || !due}>
                {isPending ? "Sending…" : "Send request"}
              </button>
            )}
          </div>
        </div>
      </dialog>
    </>
  );
}
