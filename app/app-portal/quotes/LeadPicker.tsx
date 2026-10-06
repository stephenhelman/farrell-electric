"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createPortalLeadAction } from "../leads/actions";
import styles from "./LeadPicker.module.css";

export interface LeadOption {
  id: string;
  label: string;
}

/**
 * Every quote hangs off a lead (the lead owns the GHL contact), so quote entry
 * starts here: choose an existing lead, or quick-create one. Choosing navigates
 * to `${basePath}?leadId=…`, where the page renders the real builder.
 */
export function LeadPicker({ leads, basePath, title }: { leads: LeadOption[]; basePath: string; title: string }) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [leadType, setLeadType] = useState<"LIGHTING" | "ELECTRICAL">("LIGHTING");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");

  function choose(leadId: string) {
    if (leadId) router.push(`${basePath}?leadId=${encodeURIComponent(leadId)}`);
  }

  function openModal() {
    setError(null);
    dialogRef.current?.showModal();
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createPortalLeadAction({
        leadType,
        name,
        phone,
        email,
        propertyAddress: address,
      });
      if (result.ok) {
        dialogRef.current?.close();
        choose(result.leadId);
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <div>
      <div className={styles.header}>
        <h1 className={styles.heading}>{title}</h1>
        <p className={styles.sub}>Who is this quote for? Choose an existing lead, or create one.</p>
      </div>

      <div className={styles.card}>
        <label htmlFor="lead-select" className={styles.label}>
          Lead
        </label>
        <div className={styles.row}>
          <select id="lead-select" defaultValue="" onChange={(e) => choose(e.target.value)} className={styles.select}>
            <option value="" disabled>
              {leads.length === 0 ? "No leads yet — create one" : "Select a lead…"}
            </option>
            {leads.map((lead) => (
              <option key={lead.id} value={lead.id}>
                {lead.label}
              </option>
            ))}
          </select>
          <button type="button" className={styles.newButton} onClick={openModal}>
            + New lead
          </button>
        </div>
      </div>

      <dialog ref={dialogRef} className={styles.dialog} aria-labelledby="new-lead-title">
        <form className={styles.form} onSubmit={submit}>
          <h2 id="new-lead-title" className={styles.dialogTitle}>
            New lead
          </h2>

          <fieldset className={styles.fieldset} disabled={isPending}>
            <legend>Type</legend>
            <div className={styles.radios}>
              <label>
                <input type="radio" name="leadType" checked={leadType === "LIGHTING"} onChange={() => setLeadType("LIGHTING")} />
                Lighting
              </label>
              <label>
                <input
                  type="radio"
                  name="leadType"
                  checked={leadType === "ELECTRICAL"}
                  onChange={() => setLeadType("ELECTRICAL")}
                />
                Electrical
              </label>
            </div>
          </fieldset>

          <div className={styles.field}>
            <label htmlFor="nl-name">Name</label>
            <input id="nl-name" value={name} onChange={(e) => setName(e.target.value)} required disabled={isPending} />
          </div>
          <div className={styles.field}>
            <label htmlFor="nl-phone">Phone</label>
            <input
              id="nl-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              disabled={isPending}
            />
          </div>
          <div className={styles.field}>
            <label htmlFor="nl-email">Email (optional)</label>
            <input
              id="nl-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isPending}
            />
          </div>
          <div className={styles.field}>
            <label htmlFor="nl-address">Property address (optional)</label>
            <input id="nl-address" value={address} onChange={(e) => setAddress(e.target.value)} disabled={isPending} />
          </div>

          {error ? (
            <p role="alert" className={styles.error}>
              {error}
            </p>
          ) : null}

          <div className={styles.actions}>
            <button type="button" className={styles.cancel} onClick={() => dialogRef.current?.close()} disabled={isPending}>
              Cancel
            </button>
            <button type="submit" className={styles.confirm} disabled={isPending}>
              {isPending ? "Creating…" : "Create lead"}
            </button>
          </div>
        </form>
      </dialog>
    </div>
  );
}
