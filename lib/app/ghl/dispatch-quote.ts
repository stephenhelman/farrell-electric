import { dispatchGhlEvent, type QuoteEventSource, type QuoteUpdateReason } from "@/lib/ghl/dispatch";
import { buildQuoteLink } from "@/lib/config";
import type { RepoQuoteDetail } from "@/lib/app/repo/types";

/**
 * Fires the quote signals. Best-effort, non-fatal — quote persistence already
 * succeeded by the time this runs, so a dispatch failure here must never
 * surface as a save/send failure to the owner. dispatchGhlEvent itself never
 * throws; this wrapper exists only to keep the call-site symmetric with the
 * rest of the best-effort seams.
 *
 *   CREATED  — once per quote, on its first save: "make the GHL Quote object".
 *   SENT     — delivery only: "send this link to the customer".
 *   ACCEPTED — the quote was accepted (by the customer or a rep); the object
 *             already exists by now. `source` says which.
 *   UPDATED  — total change or a non-accepted status change (declined,
 *             expired). `reason`/`notify`/`source` come from the caller, which
 *             stamps source from the endpoint — never from a request body.
 *
 * ID-bookkeeping does not happen here — GHL mints the custom-object id from
 * quote.created and reports it back via the inbound webhook, which writes
 * ghlCustomObjectId onto the quote. The contact and opportunity ids live on
 * the lead and are read through it.
 */
export type QuoteDispatch =
  | { event: "CREATED" | "SENT" }
  | { event: "ACCEPTED"; source: QuoteEventSource }
  | { event: "UPDATED"; reason: QuoteUpdateReason; notify: boolean; source: QuoteEventSource };

export async function dispatchQuoteToGhl(quote: RepoQuoteDetail, dispatch: QuoteDispatch): Promise<void> {
  const publicQuoteUrl = quote.publicToken ? buildQuoteLink(quote.publicToken) : "";

  if (dispatch.event === "CREATED") {
    await dispatchGhlEvent({
      event: "quote.created",
      quoteId: quote.id,
      quoteNumber: quote.number,
      ...(quote.leadId && { leadId: quote.leadId }),
      ghlContactId: quote.ghlContactId,
      ghlSalesOpportunityId: quote.ghlSalesOpportunityId,
      customerName: quote.customerName,
      customerPhone: quote.customerPhone,
      customerEmail: quote.customerEmail,
      customerAddress: quote.customerAddress,
      total: quote.total,
      status: quote.status === "SENT" ? "SENT" : "DRAFT",
      publicQuoteUrl,
    });
    return;
  }

  if (dispatch.event === "SENT") {
    await dispatchGhlEvent({
      event: "quote.sent",
      quoteId: quote.id,
      quoteNumber: quote.number,
      ghlContactId: quote.ghlContactId,
      ghlSalesOpportunityId: quote.ghlSalesOpportunityId,
      customerName: quote.customerName,
      customerPhone: quote.customerPhone,
      customerEmail: quote.customerEmail,
      total: quote.total,
      publicQuoteUrl,
    });
    return;
  }

  if (dispatch.event === "UPDATED") {
    await dispatchGhlEvent({
      event: "quote.updated",
      quoteId: quote.id,
      quoteNumber: quote.number,
      ghlContactId: quote.ghlContactId,
      ghlSalesOpportunityId: quote.ghlSalesOpportunityId,
      total: quote.total,
      status: quote.status,
      publicQuoteUrl,
      reason: dispatch.reason,
      notify: dispatch.notify,
      source: dispatch.source,
      declineReason: quote.status === "DECLINED" ? quote.declineReason : null,
      declineReasonDetail: quote.status === "DECLINED" ? quote.declineReasonDetail : null,
    });
    return;
  }

  await dispatchGhlEvent({
    event: "quote.accepted",
    source: dispatch.source,
    quoteId: quote.id,
    quoteNumber: quote.number,
    ghlContactId: quote.ghlContactId,
    ghlSalesOpportunityId: quote.ghlSalesOpportunityId,
    total: quote.total,
    publicQuoteUrl,
  });
}
