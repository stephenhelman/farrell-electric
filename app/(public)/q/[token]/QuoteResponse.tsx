"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { DeclineModal } from "@/components/app/DeclineModal";
import { acceptQuoteByTokenAction, declineQuoteByTokenAction } from "./actions";
import styles from "./page.module.css";

type Status = "DRAFT" | "SENT" | "ACCEPTED" | "DECLINED" | "EXPIRED";

/** Customer Accept / Decline. Accept locks to an "Accepted" state; closed quotes show their state instead of buttons. */
export function QuoteResponse({ token, status }: { token: string; status: Status }) {
  const router = useRouter();
  const [declineOpen, setDeclineOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (status === "ACCEPTED") {
    return (
      <div className={styles.responseDone} role="status">
        <span aria-hidden="true">✓</span> Accepted — thank you! We&rsquo;ll be in touch to schedule the work.
      </div>
    );
  }
  if (status === "DECLINED") {
    return <div className={styles.responseClosed}>This quote was declined.</div>;
  }
  if (status === "EXPIRED") {
    return <div className={styles.responseClosed}>This quote has expired. Contact us if you&rsquo;d like an updated one.</div>;
  }
  if (status !== "SENT") return null;

  function accept() {
    setError(null);
    startTransition(async () => {
      const result = await acceptQuoteByTokenAction(token);
      if (result.ok) router.refresh();
      else setError(result.error);
    });
  }

  return (
    <div className={styles.response}>
      <div className={styles.responseActions}>
        <button type="button" className={styles.acceptBtn} disabled={isPending} onClick={accept}>
          {isPending ? "Working…" : "Accept quote"}
        </button>
        <button type="button" className={styles.declineBtn} disabled={isPending} onClick={() => setDeclineOpen(true)}>
          Decline
        </button>
      </div>
      {error ? (
        <p role="alert" className={styles.responseError}>
          {error}
        </p>
      ) : null}
      <DeclineModal
        open={declineOpen}
        context="public"
        onClose={() => setDeclineOpen(false)}
        onSubmit={async ({ reason, detail }) => {
          const result = await declineQuoteByTokenAction(token, reason, detail);
          if (!result.ok) return result.error;
          setDeclineOpen(false);
          router.refresh();
          return null;
        }}
      />
    </div>
  );
}
