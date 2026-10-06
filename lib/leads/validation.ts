import type { LeadIntent, LeadPayload } from "./types";

/**
 * Intake guards for POST /api/leads. Pure — safe to import from the client
 * form (field limits) and the route (everything).
 *
 * Design bias: a false positive (a real customer walled out) costs far more
 * than a false negative (one bot slips through), so every rule here errs
 * toward letting a borderline human submission through.
 */

/**
 * Honeypot input name. Deliberately a nonsense token — NOT a word like
 * "company"/"url"/"website" that password managers and browser autofill
 * pattern-match. A human never sees or fills it.
 */
export const HONEYPOT_FIELD = "xq9vz4kw";

/**
 * Minimum time the form must have been open before a submission counts as
 * human. 2s, not 3s: a returning visitor using autofill can legitimately
 * submit within ~3s, and a silently dropped real lead is the worst outcome.
 * The junk bots submit instantly, so this still catches them.
 */
export const MIN_FILL_MS = 2000;

/** Max lengths per field — generous for humans, hostile to payload stuffing. */
export const LEAD_FIELD_LIMITS = {
  name: 100,
  phone: 30,
  email: 254,
  propertyAddress: 200,
  projectDetails: 2000,
  issueType: 100,
  description: 2000,
} as const;

export const PHONE_MIN_DIGITS = 10;
/** Upper bound of E.164; lets +1 and international numbers through. */
export const PHONE_MAX_DIGITS = 15;

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const INTENTS: readonly LeadIntent[] = ["landscape-lighting", "permanent-lighting", "electrical", "commercial"];
const CONTACT_METHODS = ["phone", "email", "text"] as const;
const INTERESTED_IN = ["landscape-lighting", "permanent-lighting", "both", "not-sure"] as const;

export type BotSignal = "honeypot" | "no-stamp" | "too-fast";

/**
 * Silent-drop checks. A non-null result means: respond {ok:true}, store
 * nothing, fire nothing — the bot must not learn it was caught.
 */
export function detectBot(raw: Record<string, unknown>): BotSignal | null {
  const trap = raw[HONEYPOT_FIELD];
  if (trap !== undefined && trap !== null && trap !== "") return "honeypot";

  const elapsed = raw.formElapsedMs;
  if (typeof elapsed !== "number" || !Number.isFinite(elapsed)) return "no-stamp";
  if (elapsed < MIN_FILL_MS) return "too-fast";

  return null;
}

export type LeadValidation = { ok: true; payload: LeadPayload } | { ok: false; error: string };

type StringRule = { value: unknown; label: string; max: number; required: boolean };

function readString(rule: StringRule): { ok: true; value: string } | { ok: false; error: string } {
  const { value, label, max, required } = rule;
  if (value === undefined || value === null) {
    return required ? { ok: false, error: `${label} is required.` } : { ok: true, value: "" };
  }
  if (typeof value !== "string") return { ok: false, error: `${label} is not valid.` };

  const trimmed = value.trim();
  if (required && trimmed === "") return { ok: false, error: `${label} is required.` };
  if (trimmed.length > max) return { ok: false, error: `${label} is too long (max ${max} characters).` };
  return { ok: true, value: trimmed };
}

function pick<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === "string" && (allowed as readonly string[]).includes(value) ? (value as T) : fallback;
}

/**
 * Validates and rebuilds the lead from a WHITELIST of fields. Anything else on
 * the request body is discarded — it never reaches the DB (Lead.details stores
 * this rebuilt payload, not the raw body). Enum fields that don't match fall
 * back to a default rather than rejecting. Consent is never required and is
 * true only for a literal `true`.
 */
export function validateLeadSubmission(raw: Record<string, unknown>): LeadValidation {
  if (raw.type !== "lighting" && raw.type !== "electrical") {
    return { ok: false, error: "Missing required fields." };
  }

  const name = readString({ value: raw.name, label: "Name", max: LEAD_FIELD_LIMITS.name, required: true });
  if (!name.ok) return name;
  const phone = readString({ value: raw.phone, label: "Phone number", max: LEAD_FIELD_LIMITS.phone, required: true });
  if (!phone.ok) return phone;
  const email = readString({ value: raw.email, label: "Email", max: LEAD_FIELD_LIMITS.email, required: true });
  if (!email.ok) return email;
  const address = readString({
    value: raw.propertyAddress,
    label: "Property address",
    max: LEAD_FIELD_LIMITS.propertyAddress,
    required: true,
  });
  if (!address.ok) return address;

  const digits = phone.value.replace(/\D/g, "").length;
  if (digits < PHONE_MIN_DIGITS || digits > PHONE_MAX_DIGITS) {
    return { ok: false, error: "Please enter a valid phone number, including area code." };
  }
  if (!EMAIL_PATTERN.test(email.value)) {
    return { ok: false, error: "Please enter a valid email address." };
  }

  const base = {
    name: name.value,
    phone: phone.value,
    email: email.value,
    propertyAddress: address.value,
    preferredContactMethod: pick(raw.preferredContactMethod, CONTACT_METHODS, "phone"),
    smsConsentTransactional: raw.smsConsentTransactional === true,
    smsConsentPromotional: raw.smsConsentPromotional === true,
  };

  if (raw.type === "lighting") {
    const projectDetails = readString({
      value: raw.projectDetails,
      label: "Project details",
      max: LEAD_FIELD_LIMITS.projectDetails,
      required: false,
    });
    if (!projectDetails.ok) return projectDetails;

    return {
      ok: true,
      payload: {
        ...base,
        type: "lighting",
        intent: pick(raw.intent, INTENTS, "landscape-lighting"),
        interestedIn: pick(raw.interestedIn, INTERESTED_IN, "not-sure"),
        projectDetails: projectDetails.value,
      },
    };
  }

  const issueType = readString({
    value: raw.issueType,
    label: "Issue type",
    max: LEAD_FIELD_LIMITS.issueType,
    required: false,
  });
  if (!issueType.ok) return issueType;
  const description = readString({
    value: raw.description,
    label: "Description",
    max: LEAD_FIELD_LIMITS.description,
    required: false,
  });
  if (!description.ok) return description;

  return {
    ok: true,
    payload: {
      ...base,
      type: "electrical",
      intent: pick(raw.intent, INTENTS, "electrical"),
      issueType: issueType.value,
      description: description.value,
    },
  };
}
