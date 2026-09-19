import { dispatchGhlEvent } from "@/lib/ghl/dispatch";
import { buildQuoteLink } from "@/lib/config";
import type { RepoQuoteDetail } from "@/lib/app/repo/types";

/**
 * Fires the §1 quote.sent / quote.accepted signals. Best-effort, non-fatal —
 * quote persistence already succeeded by the time this runs, so a dispatch
 * failure here must never surface as a save/send failure to the owner.
 * dispatchGhlEvent itself never throws; this wrapper exists only to keep the
 * call-site symmetric with the rest of the best-effort seams.
 *
 * ID-bookkeeping (ghlContactId/ghlOpportunityId/ghlCustomObjectId) does not
 * happen here — GHL mints those IDs from this signal and reports them back
 * via the inbound webhook handler, which writes them onto the mirror row.
 */
export async function syncQuoteToGhl(quote: RepoQuoteDetail, event: "SENT" | "ACCEPTED"): Promise<void> {
  const publicQuoteUrl = quote.publicToken ? buildQuoteLink(quote.publicToken) : "";

  if (event === "SENT") {
    await dispatchGhlEvent({
      event: "quote.sent",
      quoteId: quote.id,
      quoteNumber: quote.number,
      customerName: quote.customerName,
      customerPhone: quote.customerPhone,
      customerEmail: quote.customerEmail,
      customerAddress: quote.customerAddress,
      total: quote.total,
      status: "SENT",
      publicQuoteUrl,
    });
    return;
  }

  await dispatchGhlEvent({
    event: "quote.accepted",
    quoteId: quote.id,
    quoteNumber: quote.number,
    total: quote.total,
    publicQuoteUrl,
  });
}
