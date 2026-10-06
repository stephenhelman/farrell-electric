import { dispatchGhlEvent } from "@/lib/ghl/dispatch";
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
 *   ACCEPTED — the customer said yes; the object already exists by now.
 *
 * ID-bookkeeping does not happen here — GHL mints the custom-object id from
 * quote.created and reports it back via the inbound webhook, which writes
 * ghlCustomObjectId onto the quote. The contact and opportunity ids live on
 * the lead and are read through it.
 */
export async function dispatchQuoteToGhl(
  quote: RepoQuoteDetail,
  event: "CREATED" | "SENT" | "ACCEPTED",
): Promise<void> {
  const publicQuoteUrl = quote.publicToken ? buildQuoteLink(quote.publicToken) : "";

  if (event === "CREATED") {
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

  if (event === "SENT") {
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

  await dispatchGhlEvent({
    event: "quote.accepted",
    quoteId: quote.id,
    quoteNumber: quote.number,
    ghlContactId: quote.ghlContactId,
    ghlSalesOpportunityId: quote.ghlSalesOpportunityId,
    total: quote.total,
    publicQuoteUrl,
  });
}
