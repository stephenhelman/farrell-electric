import { getGhlClient } from "@/lib/ghl/client";
import { buildQuoteLink } from "@/lib/config";
import { getRepo } from "@/lib/app/repo";
import type { RepoQuoteDetail } from "@/lib/app/repo/types";

/**
 * Best-effort, non-fatal — mirrors lib/notifications/notifier.ts's Sheet/
 * notify split: quote persistence already succeeded by the time this runs,
 * so a GHL failure here must never surface as a save/send failure to the
 * owner. Every step is wrapped; nothing here throws out to the caller.
 */
export async function syncQuoteToGhl(quote: RepoQuoteDetail, event: "SENT" | "ACCEPTED"): Promise<void> {
  try {
    const client = getGhlClient();

    const contact = await client.upsertContact({
      name: quote.customerName,
      phone: quote.customerPhone,
      email: quote.customerEmail,
      address: quote.customerAddress,
      tags: ["app-quote"],
    });

    if (!contact) return; // no-op client, or the call failed — already logged by the client.

    let ghlContactId = quote.ghlContactId;
    let ghlOpportunityId = quote.ghlOpportunityId;
    ghlContactId = contact.contactId;

    const opportunity = await client.upsertOpportunity({
      contactId: contact.contactId,
      existingOpportunityId: quote.ghlOpportunityId,
      quoteNumber: quote.number,
      quoteTotal: quote.total,
      stage: event,
    });
    if (opportunity) ghlOpportunityId = opportunity.opportunityId;

    if (ghlContactId !== quote.ghlContactId || ghlOpportunityId !== quote.ghlOpportunityId) {
      const repo = await getRepo();
      await repo.updateQuoteGhlIds(quote.id, { ghlContactId, ghlOpportunityId });
    }

    if (event === "SENT" && quote.publicToken) {
      const link = buildQuoteLink(quote.publicToken);
      const message = `Hi ${quote.customerName}, here is your Farrell Electric quote:\n\n${link}\n\nReply with any questions or if you'd like to move forward.`;

      if (quote.customerEmail) {
        await client.sendMessage({
          contactId: contact.contactId,
          channel: "Email",
          subject: `Your Farrell Electric Quote #${quote.number}`,
          message,
        });
      }

      if (quote.customerPhone) {
        // SMS delivery path exists and fires today, but the message won't
        // actually land until A2P 10DLC registration clears — a separate
        // workstream, not built here. Email above works without it.
        await client.sendMessage({ contactId: contact.contactId, channel: "SMS", message });
      }
    }
  } catch (error) {
    console.error("[syncQuoteToGhl] failed (best-effort, non-fatal)", error);
  }
}
