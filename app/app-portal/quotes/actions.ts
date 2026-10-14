"use server";

import { getRepo } from "@/lib/app/repo";
import type { SaveQuoteInput } from "@/lib/app/repo/types";
import { requireRepSession } from "@/lib/app/auth/require-session";
import { acceptQuote, declineQuote, expireQuote, saveQuote } from "@/lib/app/quotes/transitions";

// Every export here is a reachable POST endpoint. Each rep action authenticates
// first, then passes source "rep" as a literal to the shared transition core —
// no action takes `source` as a parameter, so it can't be supplied by a caller.

export async function saveQuoteAction(input: SaveQuoteInput, options?: { notify?: boolean }) {
  await requireRepSession();
  return saveQuote(input, options);
}

/**
 * Marks the quote accepted (same core the customer's Accept uses) and then
 * creates the Job — the rep's authoritative step. Returns the Job id.
 */
export async function acceptQuoteAction(id: string): Promise<string> {
  await requireRepSession();
  const result = await acceptQuote(id, "rep");
  if (!result.ok) throw new Error(result.error);
  return createJobAction(id);
}

/** For a quote the customer already accepted: the rep's path to its Job. Idempotent. */
export async function createJobAction(id: string): Promise<string> {
  await requireRepSession();
  const repo = await getRepo();
  const jobId = await repo.ensureJobForQuote(id);
  if (!jobId) throw new Error("Only an accepted quote can have a job.");
  return jobId;
}

export async function declineQuoteAction(
  id: string,
  reason: string,
  detail: string,
  notify: boolean,
): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireRepSession();
  const result = await declineQuote({ quoteId: id, source: "rep", reason, detail, notify });
  return result.ok ? { ok: true } : result;
}

export async function expireQuoteAction(
  id: string,
  notify: boolean,
): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireRepSession();
  const result = await expireQuote(id, notify);
  return result.ok ? { ok: true } : result;
}
