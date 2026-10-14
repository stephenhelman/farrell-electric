import { QUOTE_DECLINE_REASONS, type QuoteDeclineReason } from "@/lib/app/repo/types";

export type DeclineContext = "public" | "rep";

/** Customer-facing list leaves out NO_RESPONSE — a customer can't decline by not responding. */
const PUBLIC_REASONS: readonly QuoteDeclineReason[] = [
  "PRICE_TOO_HIGH",
  "LOST_TO_COMPETITOR",
  "TIMING",
  "SCOPE_CHANGED",
  "FINANCING",
  "OTHER",
];

export const DECLINE_REASON_LABELS: Record<QuoteDeclineReason, string> = {
  PRICE_TOO_HIGH: "Price is too high",
  LOST_TO_COMPETITOR: "Went with another company",
  TIMING: "Timing isn't right",
  SCOPE_CHANGED: "The scope changed",
  FINANCING: "Financing",
  NO_RESPONSE: "No response from customer",
  OTHER: "Other",
};

export function declineReasonsFor(context: DeclineContext): readonly QuoteDeclineReason[] {
  return context === "public" ? PUBLIC_REASONS : QUOTE_DECLINE_REASONS;
}

/** Validates untrusted input against the context's option list. OTHER requires detail text. */
export function parseDecline(
  context: DeclineContext,
  reason: unknown,
  detail: unknown,
): { reason: QuoteDeclineReason; detail: string | null } | null {
  if (typeof reason !== "string" || !(declineReasonsFor(context) as readonly string[]).includes(reason)) return null;
  const trimmed = typeof detail === "string" ? detail.trim().slice(0, 1000) : "";
  if (reason === "OTHER" && trimmed === "") return null;
  return { reason: reason as QuoteDeclineReason, detail: trimmed === "" ? null : trimmed };
}
