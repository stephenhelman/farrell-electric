"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./QuoteDialog.module.css";

interface Props {
  open: boolean;
  title: string;
  /** Smart default for the toggle; the rep can override. */
  defaultNotify: boolean;
  confirmLabel: string;
  pending?: boolean;
  onConfirm: (notify: boolean) => void;
  onCancel: () => void;
}

/** Rep-side "Notify customer?" prompt. Its answer becomes quote.updated's `notify`. */
export function NotifyCustomerDialog({ open, title, defaultNotify, confirmLabel, pending, onConfirm, onCancel }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const [notify, setNotify] = useState(defaultNotify);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      setNotify(defaultNotify);
      dialog.showModal();
    }
    if (!open && dialog.open) dialog.close();
  }, [open, defaultNotify]);

  return (
    <dialog ref={ref} className={styles.dialog} aria-labelledby="notify-title" onCancel={onCancel}>
      <div className={styles.body}>
        <h2 id="notify-title" className={styles.title}>
          {title}
        </h2>
        <label className={styles.check}>
          <input type="checkbox" checked={notify} onChange={(event) => setNotify(event.target.checked)} />
          <span>Notify customer</span>
        </label>
        <p className={styles.note}>
          {notify ? "The customer will be sent a message about this change." : "The change is recorded; the customer won't be messaged."}
        </p>
        <div className={styles.actions}>
          <button type="button" className={styles.cancel} disabled={pending} onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className={styles.confirm} disabled={pending} onClick={() => onConfirm(notify)}>
            {pending ? "Working…" : confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  );
}
