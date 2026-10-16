"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { markPaidAction } from "../actions";
import { MANUAL_PAYMENT_METHODS } from "@/lib/app/jobs/manual-payment";
import { formatMoney } from "@/lib/app/format";
import styles from "./RecordPayment.module.css";

type Kind = "DEPOSIT" | "BALANCE";

interface Props {
  jobId: string;
  depositRequired: boolean;
  depositAmount: number | null;
  depositPaid: boolean;
  /** Deposit-kind money received so far. */
  depositReceived: number;
  /** revenue - everything received. */
  balanceDue: number;
}

function titleCase(value: string): string {
  return value.charAt(0) + value.slice(1).toLowerCase();
}

function toField(amount: number): string {
  return amount > 0 ? String(Math.round(amount * 100) / 100) : "";
}

/** Rep records money settled outside the app. Card is not offered — it arrives via the QuickBooks webhook. */
export function RecordPayment({ jobId, depositRequired, depositAmount, depositPaid, depositReceived, balanceDue }: Props) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const depositOutstanding = Math.max((depositAmount ?? 0) - depositReceived, 0);
  const outstandingFor = (kind: Kind) => (kind === "DEPOSIT" ? depositOutstanding : Math.max(balanceDue, 0));
  const defaultKind: Kind = depositRequired && !depositPaid ? "DEPOSIT" : "BALANCE";

  const [kind, setKind] = useState<Kind>(defaultKind);
  const [method, setMethod] = useState("CHECK");
  const [amount, setAmount] = useState(toField(outstandingFor(defaultKind)));
  const [reference, setReference] = useState("");
  const [paidAt, setPaidAt] = useState("");
  // One key per opened dialog: a double-submit or retry records once.
  const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID());

  function open() {
    setError(null);
    setKind(defaultKind);
    setAmount(toField(outstandingFor(defaultKind)));
    dialogRef.current?.showModal();
  }

  function close() {
    dialogRef.current?.close();
  }

  function changeKind(next: Kind) {
    setKind(next);
    setAmount(toField(outstandingFor(next)));
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();

    startTransition(async () => {
      const result = await markPaidAction(jobId, {
        kind,
        method,
        amount: Number(amount),
        reference: reference.trim() || null,
        paidAt: paidAt || null,
        idempotencyKey,
      });
      if (result.ok) {
        setReference("");
        setPaidAt("");
        setIdempotencyKey(crypto.randomUUID());
        close();
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <>
      <button type="button" className={styles.trigger} onClick={open}>
        Record payment
      </button>

      <dialog ref={dialogRef} className={styles.dialog} aria-labelledby="payment-title">
        <form className={styles.form} onSubmit={submit}>
          <h2 id="payment-title" className={styles.title}>
            Record payment
          </h2>

          <dl className={styles.context}>
            <dt>Deposit</dt>
            <dd>
              {depositRequired
                ? `${formatMoney(depositAmount ?? 0)} · ${depositPaid ? "paid" : `${formatMoney(depositReceived)} received`}`
                : "Not required"}
            </dd>
            <dt>Balance due</dt>
            <dd>{formatMoney(Math.max(balanceDue, 0))}</dd>
          </dl>

          <div className={styles.field}>
            <label htmlFor="p-kind">Applies to</label>
            <select id="p-kind" value={kind} onChange={(e) => changeKind(e.target.value as Kind)} disabled={isPending}>
              <option value="DEPOSIT">Deposit</option>
              <option value="BALANCE">Balance</option>
            </select>
          </div>

          <div className={styles.field}>
            <label htmlFor="p-method">Method</label>
            <select id="p-method" value={method} onChange={(e) => setMethod(e.target.value)} disabled={isPending}>
              {MANUAL_PAYMENT_METHODS.map((value) => (
                <option key={value} value={value}>
                  {titleCase(value)}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.field}>
            <label htmlFor="p-amount">Amount received ($)</label>
            <input
              id="p-amount"
              type="number"
              inputMode="decimal"
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              disabled={isPending}
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="p-ref">Reference (check #, Zelle memo)</label>
            <input id="p-ref" value={reference} onChange={(e) => setReference(e.target.value)} disabled={isPending} />
          </div>

          <div className={styles.field}>
            <label htmlFor="p-date">Date received (blank = today)</label>
            <input id="p-date" type="date" value={paidAt} onChange={(e) => setPaidAt(e.target.value)} disabled={isPending} />
          </div>

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
              {isPending ? "Recording…" : "Record payment"}
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
