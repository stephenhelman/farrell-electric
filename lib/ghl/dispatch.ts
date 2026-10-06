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

/**
 * Fired ONCE per quote, the first time it is saved. Its only job: tell GHL to
 * create the Quote custom object and associate it to the contact (the mirror
 * of lead.created). The echo-back writes just ghlCustomObjectId. Customer
 * fields + leadId are here so GHL can associate it; `total` is the only money.
 */
export interface QuoteCreatedPayload {
  event: "quote.created";
  quoteId: string;
  quoteNumber: number;
  leadId?: string;
  /** Read through the lead; null for an orphan quote that has no contact id yet. */
  ghlContactId: string | null;
  /** Sales-pipeline opp, read through the lead. Null for orphan quotes / before the lead echo-back. */
  ghlSalesOpportunityId: string | null;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  customerAddress: string;
  total: number;
  status: "DRAFT" | "SENT";
  /** Empty until a public token is minted (first SENT). */
  publicQuoteUrl: string;
}

/**
 * DELIVERY ONLY: what GHL needs to send the quote link to the customer (and
 * move the opportunity to Quoted). It no longer implies object creation — the
 * object exists from quote.created.
 */
export interface QuoteSentPayload {
  event: "quote.sent";
  quoteId: string;
  quoteNumber: number;
  /** Read through the lead; null for an orphan quote that has no contact id yet. */
  ghlContactId: string | null;
  /** Sales-pipeline opp, read through the lead. Null for orphan quotes / before the echo-back. */
  ghlSalesOpportunityId: string | null;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  total: number;
  publicQuoteUrl: string;
}

export interface QuoteAcceptedPayload {
  event: "quote.accepted";
  quoteId: string;
  quoteNumber: number;
  /** Read through the lead; null for an orphan quote that has no contact id yet. */
  ghlContactId: string | null;
  /** Sales-pipeline opp, read through the lead. Null for orphan quotes / before the echo-back. */
  ghlSalesOpportunityId: string | null;
  total: number;
  publicQuoteUrl: string;
}

/**
 * Fired when a rep generates/regenerates the contract. Carries the stored deal
 * terms and customer-facing data only — `total` is the quote's customer-facing
 * total. Never revenue/actualCost/margin, and never pipeline/stage ids. The
 * Operations opportunity id is an identifier, not routing config: it is read
 * through the lead and sent so GHL can find the opp to move.
 */
export interface JobContractSentPayload {
  event: "job.contract_sent";
  jobId: string;
  quoteId: string;
  quoteNumber: number;
  /** Null until the GHL lead round-trip has written it back to the quote. */
  ghlContactId: string | null;
  /** Ops-pipeline opp, read through the lead. Null for orphan jobs / before the ops echo-back. */
  ghlOpsOpportunityId: string | null;
  scopeOfWork: string;
  paymentType: "CARD" | "CHECK" | "CASH" | "FINANCING" | "OTHER";
  depositRequired: boolean;
  depositAmount: number | null;
  total: number;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  customerAddress: string;
}

/**
 * Fired exactly once, when the server-side close gate is met:
 * contract signed AND (deposit paid OR no deposit required). Identifiers +
 * customer-facing total only — same economics wall and ID discipline as above.
 */
export interface JobClosedPayload {
  event: "job.closed";
  jobId: string;
  quoteId: string;
  quoteNumber: number;
  ghlContactId: string | null;
  ghlOpsOpportunityId: string | null;
  total: number;
  /** ISO timestamp. */
  closedAt: string;
}

/**
 * Fired exactly once, when the complete gate is met:
 * installed AND (final invoice paid OR no balance due).
 */
export interface JobCompletedPayload {
  event: "job.completed";
  jobId: string;
  quoteId: string;
  quoteNumber: number;
  ghlContactId: string | null;
  ghlOpsOpportunityId: string | null;
  total: number;
  /** ISO timestamp. */
  completedAt: string;
  /** ISO timestamp — the warranty start. */
  installedDate: string;
}

export type GhlEventPayload =
  | LeadCreatedPayload
  | QuoteCreatedPayload
  | QuoteSentPayload
  | QuoteAcceptedPayload
  | JobContractSentPayload
  | JobClosedPayload
  | JobCompletedPayload;

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
