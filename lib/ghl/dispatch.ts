/**
 * The single outbound seam for GoHighLevel — fire-and-forget POSTs to
 * GHL_WEBHOOK_URL. No-ops (logged) when the URL isn't set, so the app builds
 * and runs with zero GHL credentials. Never throws to the caller: dispatch
 * failures are logged and swallowed, same best-effort discipline as
 * lib/notifications/notifier.ts's LogNotifier.
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
  total: number;
  publicQuoteUrl: string;
}

export type GhlEventPayload = LeadCreatedPayload | QuoteSentPayload | QuoteAcceptedPayload;

/**
 * POSTs the event payload to GHL_WEBHOOK_URL. No-ops when unset. Never
 * throws — a webhook failure logs loudly but must never block or roll back
 * the caller's DB write.
 */
export async function dispatchGhlEvent(payload: GhlEventPayload): Promise<void> {
  const url = process.env.GHL_WEBHOOK_URL;

  if (!url) {
    console.log(`[GHL:dispatch:noop] ${payload.event} — GHL_WEBHOOK_URL not set.`, payload);
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
