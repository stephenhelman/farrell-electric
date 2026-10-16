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
  /** The DB lead id — immutable, so GHL can always locate the contact even when ghlContactId is null or the email changed. */
  leadId?: string;
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

/** WHO triggered a quote change. Always stamped server-side by the endpoint that was hit — never read from a request. */
export type QuoteEventSource = "rep" | "customer";

/** WHAT changed on a quote.updated. The status value itself travels in `status`. */
export type QuoteUpdateReason = "total" | "status" | "photos_added";

/**
 * Fired when a SENT-or-later quote's total changes, or its status moves to
 * something other than ACCEPTED (declined, expired — accepting is
 * quote.accepted). Always carries the current object fields so GHL's object
 * sync stays honest regardless of `notify`. `notify` gates the CUSTOMER
 * message; the owner alert is derived GHL-side from source === "customer".
 * `photos_added` is a valid reason but nothing fires it yet (gallery build).
 */
export interface QuoteUpdatedPayload {
  event: "quote.updated";
  quoteId: string;
  quoteNumber: number;
  /** The DB lead id — immutable, so GHL can always locate the contact even when ghlContactId is null or the email changed. */
  leadId?: string;
  ghlContactId: string | null;
  ghlSalesOpportunityId: string | null;
  total: number;
  status: "DRAFT" | "SENT" | "ACCEPTED" | "DECLINED" | "EXPIRED";
  publicQuoteUrl: string;
  reason: QuoteUpdateReason;
  notify: boolean;
  source: QuoteEventSource;
  /** Non-null only on a decline. */
  declineReason: string | null;
  declineReasonDetail: string | null;
}

export interface QuoteAcceptedPayload {
  event: "quote.accepted";
  source: QuoteEventSource;
  quoteId: string;
  quoteNumber: number;
  /** The DB lead id — immutable, so GHL can always locate the contact even when ghlContactId is null or the email changed. */
  leadId?: string;
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
  paymentType: "CARD" | "CHECK" | "CASH" | "FINANCING" | "OTHER" | "ZELLE";
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

/**
 * Fired once per recorded payment (deduped on the Payment's externalRef). Money
 * received only — amountPaid is this payment, balanceRemaining what is still owed
 * after it. Never revenue/cost/margin; `total` is intentionally absent too.
 */
interface JobPaymentPayload {
  jobId: string;
  quoteId: string;
  quoteNumber: number;
  /** The DB lead id — immutable GHL lookup key; absent for an orphan quote. */
  leadId?: string;
  ghlContactId: string | null;
  ghlOpsOpportunityId: string | null;
  amountPaid: number;
  method: "CARD" | "CHECK" | "CASH" | "FINANCING" | "OTHER" | "ZELLE";
  balanceRemaining: number;
  /** ISO timestamp the payment was received. */
  paidAt: string;
}

export interface JobDepositPaidPayload extends JobPaymentPayload {
  event: "job.deposit_paid";
  kind: "DEPOSIT";
}

export interface JobBalancePaidPayload extends JobPaymentPayload {
  event: "job.balance_paid";
  kind: "BALANCE";
}

export type GhlEventPayload =
  | LeadCreatedPayload
  | QuoteCreatedPayload
  | QuoteSentPayload
  | QuoteUpdatedPayload
  | QuoteAcceptedPayload
  | JobContractSentPayload
  | JobClosedPayload
  | JobCompletedPayload
  | JobDepositPaidPayload
  | JobBalancePaidPayload;

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

/** A slow GHL must not hang the caller (e.g. a payment webhook response). */
const DISPATCH_TIMEOUT_MS = 5000;

/**
 * POSTs the event payload to its entity's webhook URL. No-ops when that URL
 * is unset. Aborts after DISPATCH_TIMEOUT_MS. Never throws — a webhook failure logs loudly but must never
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

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DISPATCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (!response.ok) {
      console.error(`[GHL:dispatch] ${payload.event} failed`, response.status, await response.text());
    }
  } catch (error) {
    console.error(`[GHL:dispatch] ${payload.event} threw (best-effort, non-fatal)`, error);
  } finally {
    clearTimeout(timer);
  }
}
