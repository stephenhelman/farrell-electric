import { getRepo } from "@/lib/app/repo";
import type { QuoteDeclineReason } from "@/lib/app/repo/types";
import { dispatchQuoteToGhl } from "@/lib/app/ghl/dispatch-quote";
import type { SaveQuoteInput } from "@/lib/app/repo/types";
import type { QuoteEventSource } from "@/lib/ghl/dispatch";
import { parseDecline } from "./decline-reasons";

/**
 * The ONE implementation of each quote status transition. Rep actions and
 * public (token) actions both land here and differ only in the `source`
 * argument — which is supplied by the calling endpoint as a literal, never
 * from a request. Nothing exported by an action file accepts a `source`.
 *
 * Each transition is atomic in the repo (the status guard lives in the
 * UPDATE's WHERE), and its GHL event fires only for the call that actually
 * made the transition, so repeats and double-clicks are clean no-ops.
 */
export type TransitionResult = { ok: true; transitioned: boolean } | { ok: false; error: string };

export async function acceptQuote(quoteId: string, source: QuoteEventSource): Promise<TransitionResult> {
  const repo = await getRepo();
  const quote = await repo.getQuote(quoteId);
  if (!quote) return { ok: false, error: "Quote not found." };

  if (quote.status === "ACCEPTED") return { ok: true, transitioned: false };
  if (quote.status === "DECLINED" || quote.status === "EXPIRED") {
    return { ok: false, error: `This quote has been ${quote.status.toLowerCase()} and can't be accepted.` };
  }
  // A customer can only act on a quote that was actually sent to them.
  if (source === "customer" && quote.status !== "SENT") return { ok: false, error: "This quote isn't available." };

  const transitioned = await repo.acceptQuote(quoteId, source);
  if (transitioned) {
    const accepted = await repo.getQuote(quoteId);
    if (accepted) await dispatchQuoteToGhl(accepted, { event: "ACCEPTED", source });
  }
  return { ok: true, transitioned };
}

export async function declineQuote(input: {
  quoteId: string;
  source: QuoteEventSource;
  reason: unknown;
  detail: unknown;
  /** Honored only for source "rep". A customer decline never messages the customer. */
  notify?: boolean;
}): Promise<TransitionResult> {
  const parsed = parseDecline(input.source === "customer" ? "public" : "rep", input.reason, input.detail);
  if (!parsed) return { ok: false, error: "Choose a reason (and describe it if you choose Other)." };

  const repo = await getRepo();
  const quote = await repo.getQuote(input.quoteId);
  if (!quote) return { ok: false, error: "Quote not found." };

  if (quote.status === "DECLINED") return { ok: true, transitioned: false };
  if (quote.status === "ACCEPTED" || quote.status === "EXPIRED") {
    return { ok: false, error: `This quote has been ${quote.status.toLowerCase()} and can't be declined.` };
  }
  if (input.source === "customer" && quote.status !== "SENT") return { ok: false, error: "This quote isn't available." };

  const transitioned = await repo.declineQuote(input.quoteId, parsed);
  if (transitioned) await fireStatusUpdate(input.quoteId, input.source, input.source === "rep" && input.notify === true);
  return { ok: true, transitioned };
}

/** Manual, rep-only. Auto time-based expiry is a future item. */
export async function expireQuote(quoteId: string, notify: boolean): Promise<TransitionResult> {
  const repo = await getRepo();
  const quote = await repo.getQuote(quoteId);
  if (!quote) return { ok: false, error: "Quote not found." };
  if (quote.status === "EXPIRED") return { ok: true, transitioned: false };
  if (quote.status !== "SENT") return { ok: false, error: "Only a sent quote can be marked expired." };

  const transitioned = await repo.expireQuote(quoteId);
  if (transitioned) await fireStatusUpdate(quoteId, "rep", notify);
  return { ok: true, transitioned };
}

async function fireStatusUpdate(quoteId: string, source: QuoteEventSource, notify: boolean): Promise<void> {
  const repo = await getRepo();
  const updated = await repo.getQuote(quoteId);
  if (updated) await dispatchQuoteToGhl(updated, { event: "UPDATED", reason: "status", notify, source });
}


/** Persists a rep's save and fires the matching quote events. Source is always "rep": only the session-gated saveQuoteAction calls this. */
export async function saveQuote(input: SaveQuoteInput, options?: { notify?: boolean }) {
  const repo = await getRepo();
  // A save with no id is the quote's FIRST persist — the one and only create
  // path (builder, estimator and lead-prefill all land here), so quote.created
  // fires exactly once per quote. Awaited in order: created, sent, updated.
  const isFirstSave = !input.id;

  // Orphan-quote guard: a new quote must hang off an existing lead (which owns
  // the GHL contact id). The UI forces a lead choice, but this is the real
  // enforcement — the estimator, a hand-edited URL, or a stale tab all land here.
  if (isFirstSave) {
    if (!input.leadId) {
      throw new Error("A quote must be created for a lead — choose or create one first.");
    }
    if (!(await repo.getLeadById(input.leadId))) {
      throw new Error("That lead no longer exists — choose or create one first.");
    }
  }

  const previous = input.id ? await repo.getQuote(input.id) : null;
  if (input.id && !previous) throw new Error("Quote not found.");
  // The builder only saves into DRAFT/SENT; a saved-over ACCEPTED/DECLINED/EXPIRED quote would silently reopen.
  if (previous && previous.status !== "DRAFT" && previous.status !== "SENT") {
    throw new Error(`This quote is ${previous.status.toLowerCase()} and can no longer be edited.`);
  }

  const quote = await repo.saveQuote(input);

  if (isFirstSave) {
    await dispatchQuoteToGhl(quote, { event: "CREATED" });
  }

  // quote.sent is delivery: fire on the transition INTO sent, not on every re-save.
  if (quote.status === "SENT" && (isFirstSave || previous?.status !== "SENT")) {
    await dispatchQuoteToGhl(quote, { event: "SENT" });
  }

  // A total edit on a quote the customer has already been sent. Draft edits are silent.
  if (previous?.status === "SENT" && Math.round(previous.total * 100) !== Math.round(quote.total * 100)) {
    await dispatchQuoteToGhl(quote, {
      event: "UPDATED",
      reason: "total",
      notify: options?.notify === true,
      source: "rep",
    });
  }

  return { id: quote.id, number: quote.number };
}


export type { QuoteDeclineReason };
