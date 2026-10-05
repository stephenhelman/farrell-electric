/**
 * The single outbound seam for GoHighLevel — fire-and-forget POSTs, routed
 * per entity: an event's prefix (`lead.*`, `quote.*`, `job.*`) picks its
 * target URL from ENTITY_WEBHOOKS. Each URL resolves independently and
 * no-ops (logged) when unset, so the app builds and runs with zero GHL
 * credentials and one entity can go live while the others stay unconfigured.
 * Never throws to the caller: dispatch failures are logged and swallowed,
 * same best-effort discipline as lib/notifications/notifier.ts's LogNotifier.
 *
 * Adding a future event = one payload type here + (for a new entity) one
 * ENTITY_WEBHOOKS entry and one env var. No new branching.
 *
 * Payload shapes are the §1 contract from the refactor sprint — semantic
 * events only. Stage/tag mapping is GHL automation config, not app code.
 */

export interface LeadCreatedPayload {
  event: "lead.created";
  leadId: string;
  source: string;
  leadType: "LIGHTING" | "ELECTRICAL";
  firstName: string;
  lastName: string;
  name: string;
  phone: string;
  email: string | null;
  propertyAddress: string | null;
  smsConsentTransactional: boolean;
  smsConsentPromotional: boolean;
  details: unknown;
}

export interface QuoteSentPayload {
  event: "quote.sent";
  quoteId: string;
  quoteNumber: number;
  leadId?: string;
  /** Null until the GHL lead round-trip has written it back to the quote. */
  ghlContactId: string | null;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  customerAddress: string;
  total: number;
  status: "SENT";
  publicQuoteUrl: string;
}

export interface QuoteAcceptedPayload {
  event: "quote.accepted";
  quoteId: string;
  quoteNumber: number;
  /** Null until the GHL lead round-trip has written it back to the quote. */
  ghlContactId: string | null;
  total: number;
  publicQuoteUrl: string;
}

export type GhlEventPayload = LeadCreatedPayload | QuoteSentPayload | QuoteAcceptedPayload;

/** Entity prefix → the env var naming that entity's outbound webhook URL. */
const ENTITY_WEBHOOKS = {
  lead: "GHL_WEBHOOK_URL_LEAD",
  quote: "GHL_WEBHOOK_URL_QUOTE",
  job: "GHL_WEBHOOK_URL_JOB",
} as const;

type GhlEntity = keyof typeof ENTITY_WEBHOOKS;

function isGhlEntity(value: string): value is GhlEntity {
  return value in ENTITY_WEBHOOKS;
}

/**
 * POSTs the event payload to its entity's webhook URL. No-ops when that URL
 * is unset. Never throws — a webhook failure logs loudly but must never
 * block or roll back the caller's DB write.
 */
export async function dispatchGhlEvent(payload: GhlEventPayload): Promise<void> {
  const entity = payload.event.split(".")[0];
  if (!isGhlEntity(entity)) {
    console.error(`[GHL:dispatch] ${payload.event} has no registered entity — dropped.`);
    return;
  }

  const envName = ENTITY_WEBHOOKS[entity];
  const url = process.env[envName];

  if (!url) {
    console.log(`[GHL:dispatch:noop] ${payload.event} — ${envName} not set.`, payload);
    return;
  }

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.error(`[GHL:dispatch] ${payload.event} failed`, response.status, await response.text());
    }
  } catch (error) {
    console.error(`[GHL:dispatch] ${payload.event} threw (best-effort, non-fatal)`, error);
  }
}
