"use server";

import { getRepo } from "@/lib/app/repo";
import type { SaveQuoteInput } from "@/lib/app/repo/types";
import { requireRepSession } from "@/lib/app/auth/require-session";
import { createJobForQuote } from "@/lib/app/jobs/create";
import { acceptQuote, declineQuote, expireQuote, saveQuote } from "@/lib/app/quotes/transitions";

export interface CreateJobActionResult {
  jobId: string;
  /** Non-null when the SOW PDF wasn't produced/stored — surfaced to the rep; the job was still created. */
  warning: string | null;
}

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
export async function acceptQuoteAction(id: string): Promise<CreateJobActionResult> {
  await requireRepSession();
  const result = await acceptQuote(id, "rep");
  if (!result.ok) throw new Error(result.error);
  return createJobAction(id);
}

/**
 * For a quote the customer already accepted: the rep's path to its Job.
 * Idempotent — only the call that creates the Job generates the SOW PDF and
 * fires job.created. `warning` is set when the PDF couldn't be stored; the job exists regardless.
 */
export async function createJobAction(id: string): Promise<CreateJobActionResult> {
  await requireRepSession();
  const result = await createJobForQuote(await getRepo(), id);
  if (!result.ok) throw new Error(result.error);
  return { jobId: result.jobId, warning: result.warning };
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
