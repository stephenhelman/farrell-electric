"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import type { LeadIntent, LeadPayload, LightingLeadPayload, ElectricalLeadPayload } from "@/lib/leads/types";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { Checkbox } from "@/components/ui/Checkbox";
import styles from "./ContactForm.module.css";

const INTENT_OPTIONS: { value: LeadIntent; label: string }[] = [
  { value: "landscape-lighting", label: "Landscape Lighting" },
  { value: "permanent-lighting", label: "Permanent Lighting" },
  { value: "electrical", label: "Electrical Service" },
  { value: "commercial", label: "Commercial Project" },
];

function isLightingIntent(intent: LeadIntent): boolean {
  return intent === "landscape-lighting" || intent === "permanent-lighting";
}

type SubmitStatus = "idle" | "submitting" | "success" | "error";

export function ContactForm({ initialIntent }: { initialIntent: LeadIntent | null }) {
  const [intent, setIntent] = useState<LeadIntent | null>(initialIntent);
  const [status, setStatus] = useState<SubmitStatus>("idle");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!intent) return;

    // Captured synchronously: React nulls event.currentTarget once the
    // handler's synchronous phase ends, which happens before `await` resumes.
    const form = event.currentTarget;
    const formData = new FormData(form);
    const base = {
      intent,
      name: String(formData.get("name") ?? ""),
      phone: String(formData.get("phone") ?? ""),
      email: String(formData.get("email") ?? ""),
      propertyAddress: String(formData.get("propertyAddress") ?? ""),
      smsConsentTransactional: formData.get("smsConsentTransactional") === "on",
      smsConsentPromotional: formData.get("smsConsentPromotional") === "on",
    };

    const preferredContactMethod = String(formData.get("preferredContactMethod") ?? "phone");

    const payload: LeadPayload = isLightingIntent(intent)
      ? ({
          ...base,
          type: "lighting",
          interestedIn: String(formData.get("interestedIn") ?? "not-sure"),
          projectDetails: String(formData.get("projectDetails") ?? ""),
          preferredContactMethod,
        } as LightingLeadPayload)
      : ({
          ...base,
          type: "electrical",
          issueType: String(formData.get("issueType") ?? ""),
          description: String(formData.get("description") ?? ""),
          preferredContactMethod,
        } as ElectricalLeadPayload);

    setStatus("submitting");
    try {
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      setStatus(result.ok ? "success" : "error");
      if (result.ok) {
        form.reset();
      }
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className={styles.wrap}>
      <h1 className={styles.headline}>WHAT CAN WE HELP YOU WITH?</h1>

      <div className={styles.intentGrid}>
        {INTENT_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            className={`${styles.intentButton} ${intent === option.value ? styles.intentButtonActive : ""}`}
            onClick={() => {
              setIntent(option.value);
              setStatus("idle");
            }}
            aria-pressed={intent === option.value}
          >
            {option.label}
          </button>
        ))}
      </div>

      {intent && (
        <form className={styles.form} onSubmit={handleSubmit} key={intent}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="name">
              Name
            </label>
            <input className={styles.input} id="name" name="name" type="text" required />
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="phone">
              Phone Number
            </label>
            <input className={styles.input} id="phone" name="phone" type="tel" required />
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="email">
              Email
            </label>
            <input className={styles.input} id="email" name="email" type="email" required />
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="propertyAddress">
              Property Address
            </label>
            <input className={styles.input} id="propertyAddress" name="propertyAddress" type="text" required />
          </div>

          {isLightingIntent(intent) ? (
            <>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="interestedIn">
                  Interested In
                </label>
                <select
                  className={styles.select}
                  id="interestedIn"
                  name="interestedIn"
                  defaultValue={intent}
                >
                  <option value="landscape-lighting">Landscape Lighting</option>
                  <option value="permanent-lighting">Permanent Lighting</option>
                  <option value="both">Both</option>
                  <option value="not-sure">Not Sure</option>
                </select>
              </div>

              <div className={styles.field}>
                <label className={styles.label} htmlFor="projectDetails">
                  Tell Us About Your Project
                </label>
                <textarea className={styles.textarea} id="projectDetails" name="projectDetails" />
              </div>
            </>
          ) : (
            <>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="issueType">
                  Type of Electrical Issue
                </label>
                <input className={styles.input} id="issueType" name="issueType" type="text" required />
              </div>

              <div className={styles.field}>
                <label className={styles.label} htmlFor="description">
                  Description
                </label>
                <textarea className={styles.textarea} id="description" name="description" required />
              </div>
            </>
          )}

          <div className={styles.field}>
            <span className={styles.label}>Preferred Contact Method</span>
            <div className={styles.radioRow}>
              {(["phone", "email", "text"] as const).map((method) => (
                <label key={method} className={styles.radioOption}>
                  <input
                    type="radio"
                    name="preferredContactMethod"
                    value={method}
                    defaultChecked={method === "phone"}
                  />
                  {method === "phone" ? "Phone" : method === "email" ? "Email" : "Text"}
                </label>
              ))}
            </div>
          </div>

          <div className={styles.consentGroup}>
            <Checkbox
              id="smsConsentTransactional"
              name="smsConsentTransactional"
              defaultChecked={false}
              label={
                <>
                  By submitting, you authorize Farrell Electric, Inc. to text/call the number above for
                  informational/transactional messages (such as inquiry confirmations, estimates, and appointment
                  updates), possibly using automated means. Msg/data rates apply, msg frequency varies. Consent is
                  not a condition of purchase. See <Link href="/terms">terms</Link> and{" "}
                  <Link href="/privacy">privacy policy</Link>. Text HELP for help and STOP to unsubscribe.
                </>
              }
            />
            <Checkbox
              id="smsConsentPromotional"
              name="smsConsentPromotional"
              defaultChecked={false}
              label={
                <>
                  By submitting, you authorize Farrell Electric, Inc. to text/call the number above for
                  promotional messages, possibly using automated means. Msg/data rates apply, msg frequency varies.
                  Consent is not a condition of purchase. See <Link href="/terms">terms</Link> and{" "}
                  <Link href="/privacy">privacy policy</Link>. Text HELP for help and STOP to unsubscribe.
                </>
              }
            />
          </div>

          <div className={styles.submitRow}>
            <SubmitButton variant="primary" disabled={status === "submitting"}>
              {status === "submitting"
                ? "Sending…"
                : isLightingIntent(intent)
                  ? "GET MY FREE LIGHTING ESTIMATE"
                  : "REQUEST ELECTRICAL SERVICE"}
            </SubmitButton>
          </div>

          {status === "success" && (
            <p className={`${styles.status} ${styles.statusSuccess}`}>
              Thanks — we received your request and will be in touch soon.
            </p>
          )}
          {status === "error" && (
            <p className={`${styles.status} ${styles.statusError}`}>
              Something went wrong sending your request. Please call or text us directly.
            </p>
          )}
        </form>
      )}
    </div>
  );
}
