"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { markInstalledAction } from "../actions";
import styles from "./MarkInstalled.module.css";

interface Props {
  jobId: string;
  /** Closed, install scheduled, not yet installed. */
  eligible: boolean;
  /** Formatted date once installed; shown instead of the button. */
  installedOn: string | null;
}

function today(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** Rep completes the install from the app; the date is the warranty start and may be back-dated. */
export function MarkInstalled({ jobId, eligible, installedOn }: Props) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [date, setDate] = useState("");

  function open() {
    setError(null);
    setDate(today());
    dialogRef.current?.showModal();
  }

  function close() {
    dialogRef.current?.close();
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      const result = await markInstalledAction(jobId, date || null);
      if (result.ok) {
        close();
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  if (installedOn) return <p className={styles.note}>Installed on {installedOn}</p>;
  if (!eligible) return null;

  return (
    <>
      <button type="button" className={styles.trigger} onClick={open}>
        Mark installed
      </button>

      <dialog ref={dialogRef} className={styles.dialog} aria-labelledby="installed-title">
        <form className={styles.form} onSubmit={submit}>
          <h2 id="installed-title" className={styles.title}>
            Mark installed
          </h2>
          <div className={styles.field}>
            <label htmlFor="installed-date">Install date (warranty start)</label>
            <input
              id="installed-date"
              type="date"
              value={date}
              max={today()}
              onChange={(e) => setDate(e.target.value)}
              required
              disabled={isPending}
            />
          </div>
          <p className={styles.note}>Requests the balance from the customer if one is still owed.</p>
          {error ? (
            <p role="alert" className={styles.error}>
              {error}
            </p>
          ) : null}
          <div className={styles.actions}>
            <button type="button" className={styles.cancel} onClick={close} disabled={isPending}>
              Cancel
            </button>
            <button type="submit" className={styles.confirm} disabled={isPending}>
              {isPending ? "Saving…" : "Mark installed"}
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
