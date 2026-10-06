import type { Repo } from "@/lib/app/repo/types";
import type { LeadPrefill, LeadSyncInfo } from "./QuoteBuilder";

function projectDetailsNotes(details: { type: "lighting" | "electrical" }): string {
  if (details.type === "lighting") {
    return (details as unknown as { projectDetails: string }).projectDetails ?? "";
  }
  return (details as unknown as { description: string }).description ?? "";
}

export interface QuoteLeadContext {
  leadId: string;
  leadPrefill: LeadPrefill;
  leadSync: LeadSyncInfo;
}

/** Null when there's no such lead — the page then shows the lead picker instead of a builder. */
export async function loadQuoteLeadContext(repo: Repo, leadId: string | undefined): Promise<QuoteLeadContext | null> {
  const lead = leadId ? await repo.getLeadById(leadId) : null;
  if (!lead) return null;

  return {
    leadId: lead.id,
    leadPrefill: {
      customerName: lead.name,
      customerPhone: lead.phone,
      customerEmail: lead.email ?? "",
      customerAddress: lead.propertyAddress ?? "",
      notes: projectDetailsNotes(lead.details),
    },
    leadSync: {
      // With no GHL lead webhook configured (stub mode) nothing will ever echo back — don't gate on it.
      enabled: Boolean(process.env.GHL_WEBHOOK_URL_LEAD),
      contactId: lead.ghlContactId,
      leadName: lead.name,
    },
  };
}
