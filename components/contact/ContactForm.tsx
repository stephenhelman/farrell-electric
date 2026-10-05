"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import type {
  LeadIntent,
  LeadPayload,
  LightingLeadPayload,
  ElectricalLeadPayload,
} from "@/lib/leads/types";
import { HONEYPOT_FIELD, LEAD_FIELD_LIMITS } from "@/lib/leads/validation";
import { TurnstileWidget } from "./TurnstileWidget";
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

// Inlined at build time. Unset = Turnstile is off: no widget, no script.
const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

export function ContactForm({ initialIntent }: { initialIntent: LeadIntent }) {
  const [intent, setIntent] = useState<LeadIntent>(
    initialIntent ?? "landscape-lighting",
  );
  const [status, setStatus] = useState<SubmitStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileReset, setTurnstileReset] = useState(0);
  const handleToken = useCallback((token: string | null) => setTurnstileToken(token), []);

  // Time-to-submit guard: the server drops submissions that arrive faster than
  // a human could fill the form. Elapsed time (not a timestamp) so a wrong
  // system clock can never wall out a real customer.
  const mountedAt = useRef(0);
  useEffect(() => {
    mountedAt.current = Date.now();
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!intent) return;

    if (TURNSTILE_SITE_KEY && !turnstileToken) {
      setErrorMessage("Please complete the verification check, then submit again.");
      setStatus("error");
      return;
    }

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

    const preferredContactMethod = String(
      formData.get("preferredContactMethod") ?? "phone",
    );

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
    setErrorMessage(null);
    try {
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payload,
          [HONEYPOT_FIELD]: String(formData.get(HONEYPOT_FIELD) ?? ""),
          formElapsedMs: Date.now() - mountedAt.current,
          ...(TURNSTILE_SITE_KEY && { turnstileToken }),
        }),
      });
      const result = await response.json();
      setStatus(result.ok ? "success" : "error");
      // The server's message is specific (e.g. "Please enter a valid phone number") — show it so a real person can fix it.
      setErrorMessage(result.ok ? null : typeof result.error === "string" ? result.error : null);
      if (result.ok) {
        form.reset();
      }
    } catch {
      setStatus("error");
    }
    if (TURNSTILE_SITE_KEY) setTurnstileReset((count) => count + 1);
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
            <input
              className={styles.input}
              id="name"
              name="name"
              maxLength={LEAD_FIELD_LIMITS.name}
              type="text"
              required
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="phone">
              Phone Number
            </label>
            <input
              className={styles.input}
              id="phone"
              name="phone"
              maxLength={LEAD_FIELD_LIMITS.phone}
              type="tel"
              required
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="email">
              Email
            </label>
            <input
              className={styles.input}
              id="email"
              name="email"
              maxLength={LEAD_FIELD_LIMITS.email}
              type="email"
              required
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="propertyAddress">
              Property Address
            </label>
            <input
              className={styles.input}
              id="propertyAddress"
              name="propertyAddress"
              maxLength={LEAD_FIELD_LIMITS.propertyAddress}
              type="text"
              required
            />
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
                <textarea
                  className={styles.textarea}
                  id="projectDetails"
                  name="projectDetails"
                  maxLength={LEAD_FIELD_LIMITS.projectDetails}
                />
              </div>
            </>
          ) : (
            <>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="issueType">
                  Type of Electrical Issue
                </label>
                <input
                  className={styles.input}
                  id="issueType"
                  name="issueType"
                  maxLength={LEAD_FIELD_LIMITS.issueType}
                  type="text"
                  required
                />
              </div>

              <div className={styles.field}>
                <label className={styles.label} htmlFor="description">
                  Description
                </label>
                <textarea
                  className={styles.textarea}
                  id="description"
                  name="description"
                  maxLength={LEAD_FIELD_LIMITS.description}
                  required
                />
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
                  {method === "phone"
                    ? "Phone"
                    : method === "email"
                      ? "Email"
                      : "Text"}
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
                  By submitting, you authorize Farrell Electric, Inc. to
                  text/call the number above for informational/transactional
                  messages (such as inquiry confirmations, estimates, and
                  appointment updates), possibly using automated means. Msg/data
                  rates apply, msg frequency varies. Consent is not a condition
                  of purchase. See <Link href="/terms">terms</Link> and{" "}
                  <Link href="/privacy">privacy policy</Link>. Text HELP for
                  help and STOP to unsubscribe.
                </>
              }
            />
            <Checkbox
              id="smsConsentPromotional"
              name="smsConsentPromotional"
              defaultChecked={false}
              label={
                <>
                  By submitting, you authorize Farrell Electric, Inc. to
                  text/call the number above for promotional messages, possibly
                  using automated means. Msg/data rates apply, msg frequency
                  varies. Consent is not a condition of purchase. See{" "}
                  <Link href="/terms">terms</Link> and{" "}
                  <Link href="/privacy">privacy policy</Link>. Text HELP for
                  help and STOP to unsubscribe.
                </>
              }
            />
          </div>

          {/* Honeypot: off-screen, out of the a11y tree, nonsense name, autofill/password-manager opt-outs. A human never touches it. */}
          <div className={styles.hp} aria-hidden="true">
            <input
              type="text"
              name={HONEYPOT_FIELD}
              tabIndex={-1}
              autoComplete="off"
              defaultValue=""
              data-lpignore="true"
              data-1p-ignore="true"
              data-form-type="other"
            />
          </div>

          {TURNSTILE_SITE_KEY ? (
            <TurnstileWidget siteKey={TURNSTILE_SITE_KEY} onToken={handleToken} resetCount={turnstileReset} />
          ) : null}

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
              {errorMessage ??
                "Something went wrong sending your request. Please call or text us directly."}
            </p>
          )}
        </form>
      )}
    </div>
  );
}
