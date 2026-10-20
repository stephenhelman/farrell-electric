"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { getQuoteSyncAction, sendQuoteAction } from "./actions";
import styles from "./QuoteBuilder.module.css";

const POLL_MS = 2000;
/** Bounded: after this many polls the hint becomes a manual "Refresh" prompt — GHL may be slow or down. */
const MAX_POLLS = 10;

interface Props {
  quoteId: string;
  status: "DRAFT" | "SENT";
  /** ghlCustomObjectId present as of page load. */
  hasCustomObject: boolean;
  /** Only gate on the CRM echo when GHL is configured; in stub mode nothing will ever echo back. */
  gateEnabled: boolean;
  /** Unsaved edits or a save in flight — Send delivers the STORED quote. */
  disabled: boolean;
}

/**
 * "Send" (DRAFT) / "Re-send" (SENT). Rendered only for a saved quote. While the
 * GHL quote object hasn't echoed back (ghlCustomObjectId), it's disabled with a
 * "Preparing in CRM…" hint; the echo is detected by polling getQuoteSyncAction.
 */
export function QuoteSendButton({ quoteId, status, hasCustomObject, gateEnabled, disabled }: Props) {
  const router = useRouter();
  const [ready, setReady] = useState(hasCustomObject);
  const [polls, setPolls] = useState(0);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const waiting = gateEnabled && !ready;
  const gaveUp = waiting && polls >= MAX_POLLS;

  const check = useCallback(async () => {
    setChecking(true);
    try {
      const { hasCustomObject: landed } = await getQuoteSyncAction(quoteId);
      if (landed) setReady(true);
    } catch {
      // A failed poll is just "not yet".
    } finally {
      setPolls((n) => n + 1);
      setChecking(false);
    }
  }, [quoteId]);

  useEffect(() => {
    if (!waiting || gaveUp) return;
    const timer = setTimeout(() => void check(), POLL_MS);
    return () => clearTimeout(timer);
  }, [waiting, gaveUp, polls, check]);

  function send() {
    setError(null);
    startTransition(async () => {
      try {
        const result = await sendQuoteAction(quoteId);
        if (result.ok) router.refresh();
        else setError(result.error);
      } catch {
        setError("Couldn't send the quote. Try again.");
      }
    });
  }

  return (
    <>
      <button
        type="button"
        className={styles.btnPrimary}
        disabled={disabled || isPending || waiting}
        aria-busy={isPending}
        onClick={send}
      >
        {isPending ? "Sending…" : status === "SENT" ? "Re-send" : "Send"}
      </button>
      {waiting ? (
        <span role="status" className={styles.sendHint}>
          {gaveUp ? "Not ready in CRM yet." : "Preparing in CRM…"}
          <button
            type="button"
            className={styles.sendRefresh}
            disabled={checking}
            onClick={() => {
              setPolls(0);
              void check();
            }}
          >
            {checking ? "Checking…" : "Refresh"}
          </button>
        </span>
      ) : null}
      {error ? (
        <span role="alert" className={styles.sendHint}>
          {error}
        </span>
      ) : null}
    </>
  );
}
