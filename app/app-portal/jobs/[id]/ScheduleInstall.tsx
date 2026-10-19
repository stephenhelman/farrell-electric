"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  GHL_CALENDAR_ID,
  GHL_CALENDAR_URL,
  GHL_EMBED_SCRIPT_SRC,
  PREFILL_PARAMS,
  REFRESH_DELAYS_MS,
  type PrefillKey,
} from "@/lib/app/jobs/install-calendar";
import styles from "./ScheduleInstall.module.css";

interface Props {
  jobId: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  /** Job is closed and not yet installed. */
  eligible: boolean;
  /** ISO date (yyyy-mm-dd) once the install_scheduled receiver has stamped it. */
  scheduledDate: string | null;
}

/**
 * Opens the GHL inline booking widget. The app can't read the booking result and
 * writes nothing: installScheduledDate is stamped by the install_scheduled receiver.
 */
export function ScheduleInstall({ jobId, customerName, customerPhone, customerEmail, eligible, scheduledDate }: Props) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [isOpen, setIsOpen] = useState(false);

  const src = useMemo(() => {
    const trimmed = customerName.trim();
    const space = trimmed.indexOf(" ");
    const values: Record<PrefillKey, string> = {
      jobId,
      firstName: space === -1 ? trimmed : trimmed.slice(0, space),
      lastName: space === -1 ? "" : trimmed.slice(space + 1).trim(),
      phone: customerPhone,
      email: customerEmail,
    };
    const params = new URLSearchParams();
    for (const key of Object.keys(values) as PrefillKey[]) {
      if (values[key]) params.set(PREFILL_PARAMS[key], values[key]);
    }
    return `${GHL_CALENDAR_URL}?${params.toString()}`;
  }, [jobId, customerName, customerPhone, customerEmail]);

  // GHL's helper script resizes the iframe; the iframe itself is mounted only while open.
  useEffect(() => {
    if (!isOpen) return;
    const script = document.createElement("script");
    script.src = GHL_EMBED_SCRIPT_SRC;
    script.async = true;
    document.body.appendChild(script);
    return () => script.remove();
  }, [isOpen]);

  function open() {
    setIsOpen(true);
    dialogRef.current?.showModal();
  }

  function close() {
    dialogRef.current?.close();
    setIsOpen(false);
  }

  function done() {
    close();
    router.refresh();
    for (const delay of REFRESH_DELAYS_MS) setTimeout(() => router.refresh(), delay);
  }

  if (scheduledDate) return <p className={styles.note}>Scheduled for {scheduledDate}</p>;
  if (!eligible) return null;

  return (
    <>
      <button type="button" className={styles.trigger} onClick={open}>
        Schedule install
      </button>

      <dialog ref={dialogRef} className={styles.dialog} aria-labelledby="schedule-title" onClose={() => setIsOpen(false)}>
        <div className={styles.body}>
          <h2 id="schedule-title" className={styles.title}>
            Schedule install
          </h2>
          {isOpen ? (
            <iframe
              src={src}
              title="Install booking calendar"
              id={`${GHL_CALENDAR_ID}_${jobId}`}
              allow="payment"
              scrolling="no"
              className={styles.widget}
            />
          ) : null}
          <p className={styles.note}>
            After booking, click Done. The scheduled date appears here once GoHighLevel confirms it.
          </p>
          <div className={styles.actions}>
            <button type="button" className={styles.cancel} onClick={close}>
              Cancel
            </button>
            <button type="button" className={styles.confirm} onClick={done}>
              Done
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
