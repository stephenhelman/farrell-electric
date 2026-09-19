export interface GhlContactInput {
  name: string;
  phone: string;
  email: string;
  address: string;
  /** Freeform tags for segmenting contacts in GHL (e.g. lead type/intent). */
  tags?: string[];
}

export interface GhlContactResult {
  contactId: string;
}

/** Mirrors the two quote-lifecycle moments the sprint calls out — not a
 * general-purpose stage enum. Extend deliberately, don't repurpose. */
export type GhlOpportunityStage = "SENT" | "ACCEPTED";

export interface GhlOpportunityInput {
  contactId: string;
  existingOpportunityId: string | null;
  quoteNumber: number;
  quoteTotal: number;
  stage: GhlOpportunityStage;
}

export interface GhlOpportunityResult {
  opportunityId: string;
}

export interface GhlMessageInput {
  contactId: string;
  channel: "SMS" | "Email";
  subject?: string;
  message: string;
}
