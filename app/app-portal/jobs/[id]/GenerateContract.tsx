"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { generateContractAction } from "../actions";
import { PAYMENT_TYPES } from "@/lib/app/jobs/contract";
import styles from "./GenerateContract.module.css";

interface Props {
  jobId: string;
  contractStatus: "NONE" | "SENT" | "SIGNED";
  /** Pre-filled from the stored job; blank on a first contract. */
  initial: {
    paymentType: string;
    depositRequired: boolean;
    depositAmount: number | null;
    customerName: string;
    customerPhone: string;
    customerEmail: string;
    customerAddress: string;
  };
  /** Read-only preview of the scope of work the contract will carry. */
  scopeOfWork: string;
}

function titleCase(value: string): string {
  return value.charAt(0) + value.slice(1).toLowerCase();
}

export function GenerateContract({ jobId, contractStatus, initial, scopeOfWork }: Props) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [paymentType, setPaymentType] = useState(initial.paymentType);
  const [depositRequired, setDepositRequired] = useState(initial.depositRequired);
  const [depositAmount, setDepositAmount] = useState(
    initial.depositAmount === null ? "" : String(initial.depositAmount),
  );
  const [customerName, setCustomerName] = useState(initial.customerName);
  const [customerPhone, setCustomerPhone] = useState(initial.customerPhone);
  const [customerEmail, setCustomerEmail] = useState(initial.customerEmail);
  const [customerAddress, setCustomerAddress] = useState(initial.customerAddress);

  // The server enforces this too — locking the button is just the honest UI for it.
  const locked = contractStatus === "SIGNED";
  const label = contractStatus === "SENT" ? "Regenerate Contract" : "Generate Contract";

  function open() {
    setError(null);
    dialogRef.current?.showModal();
  }

  function close() {
    dialogRef.current?.close();
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const amount = depositAmount.trim() === "" ? null : Number(depositAmount);

    startTransition(async () => {
      const result = await generateContractAction(jobId, {
        paymentType,
        depositRequired,
        depositAmount: amount,
        customerName,
        customerPhone,
        customerEmail,
        customerAddress,
      });
      if (result.ok) {
        close();
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <>
      <button type="button" className={styles.trigger} disabled={locked} onClick={open}>
        {locked ? "Contract signed" : label}
      </button>
      {locked ? <p className={styles.lockNote}>Locked — a signed agreement is never regenerated.</p> : null}

      <dialog ref={dialogRef} className={styles.dialog} aria-labelledby="contract-title">
        <form className={styles.form} onSubmit={submit}>
          <h2 id="contract-title" className={styles.title}>
            {label}
          </h2>

          <div className={styles.field}>
            <label htmlFor="c-payment">Payment type</label>
            <select
              id="c-payment"
              value={paymentType}
              onChange={(event) => setPaymentType(event.target.value)}
              required
              disabled={isPending}
            >
              <option value="" disabled>
                Select…
              </option>
              {PAYMENT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {titleCase(type)}
                </option>
              ))}
            </select>
          </div>

          <fieldset className={styles.fieldset} disabled={isPending}>
            <legend>Deposit</legend>
            <div className={styles.radios}>
              <label>
                <input
                  type="radio"
                  name="deposit"
                  checked={!depositRequired}
                  onChange={() => setDepositRequired(false)}
                />
                No deposit
              </label>
              <label>
                <input
                  type="radio"
                  name="deposit"
                  checked={depositRequired}
                  onChange={() => setDepositRequired(true)}
                />
                Deposit required
              </label>
            </div>
            {depositRequired ? (
              <div className={styles.field}>
                <label htmlFor="c-deposit">Deposit amount ($)</label>
                <input
                  id="c-deposit"
                  type="number"
                  inputMode="decimal"
                  min="0.01"
                  step="0.01"
                  value={depositAmount}
                  onChange={(event) => setDepositAmount(event.target.value)}
                  required
                />
              </div>
            ) : null}
          </fieldset>

          <fieldset className={styles.fieldset} disabled={isPending}>
            <legend>Confirm client info</legend>
            <div className={styles.field}>
              <label htmlFor="c-name">Name</label>
              <input id="c-name" value={customerName} onChange={(e) => setCustomerName(e.target.value)} required />
            </div>
            <div className={styles.field}>
              <label htmlFor="c-phone">Phone</label>
              <input id="c-phone" type="tel" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} />
            </div>
            <div className={styles.field}>
              <label htmlFor="c-email">Email</label>
              <input id="c-email" type="email" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} />
            </div>
            <div className={styles.field}>
              <label htmlFor="c-address">Address</label>
              <input
                id="c-address"
                value={customerAddress}
                onChange={(e) => setCustomerAddress(e.target.value)}
                required
              />
            </div>
          </fieldset>

          <details className={styles.sow}>
            <summary>Scope of work in the contract</summary>
            <p>{scopeOfWork || "No scope of work on this quote."}</p>
          </details>

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
              {isPending ? "Sending…" : contractStatus === "SENT" ? "Regenerate & send" : "Generate & send"}
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
