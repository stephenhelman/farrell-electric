"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { acceptQuoteAction, declineQuoteAction } from "./actions";
import styles from "./QuoteRowActions.module.css";

export function QuoteRowActions({ quoteId }: { quoteId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function accept() {
    startTransition(async () => {
      await acceptQuoteAction(quoteId);
      router.refresh();
    });
  }

  function decline() {
    startTransition(async () => {
      await declineQuoteAction(quoteId);
      router.refresh();
    });
  }

  return (
    <div className={styles.row}>
      <button type="button" className={styles.accept} disabled={isPending} onClick={accept}>
        Accept
      </button>
      <button type="button" className={styles.decline} disabled={isPending} onClick={decline}>
        Decline
      </button>
    </div>
  );
}
