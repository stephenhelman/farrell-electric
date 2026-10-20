"use server";

import { getRepo } from "@/lib/app/repo";
import type { SaveQuoteInput } from "@/lib/app/repo/types";
import { requireRepSession } from "@/lib/app/auth/require-session";
import { createJobForQuote } from "@/lib/app/jobs/create";
import { deleteDocument, isBlobUrl } from "@/lib/app/blob";
import { RENDER_MAX_COUNT } from "@/lib/app/quotes/renders";
import type { RepoQuoteRender } from "@/lib/app/repo/types";
import { acceptQuote, declineQuote, expireQuote, saveQuote, sendQuote } from "@/lib/app/quotes/transitions";

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

/**
 * Rep "Send" / "Re-send": always dispatches quote.sent; the first call also moves
 * DRAFT → SENT. Repeats re-deliver without a transition error.
 */
export async function sendQuoteAction(id: string): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireRepSession();
  const result = await sendQuote(id);
  return result.ok ? { ok: true } : result;
}

/** Polled by the Send button — reads only whether the GHL echo-back has written ghlCustomObjectId. */
export async function getQuoteSyncAction(id: string): Promise<{ hasCustomObject: boolean }> {
  await requireRepSession();
  const quote = await (await getRepo()).getQuote(id);
  return { hasCustomObject: Boolean(quote?.ghlCustomObjectId) };
}

// --- render gallery (every mutation is rep-only) ---

export type RenderActionResult = { ok: true; renders: RepoQuoteRender[] } | { ok: false; error: string };

/** Attaches an already-uploaded Blob image to the quote, at the end of the order. */
export async function attachQuoteRenderAction(quoteId: string, url: string): Promise<RenderActionResult> {
  await requireRepSession();
  const repo = await getRepo();
  const fail = async (error: string): Promise<RenderActionResult> => {
    await deleteDocument(url); // don't leave an orphan blob behind
    return { ok: false, error };
  };
  if (!isBlobUrl(url)) return { ok: false, error: "That isn't an uploaded image." };
  if ((await repo.listQuoteRenders(quoteId)).length >= RENDER_MAX_COUNT) {
    return fail(`A quote can have at most ${RENDER_MAX_COUNT} renders.`);
  }
  if (!(await repo.addQuoteRender(quoteId, url))) return fail("Quote not found.");
  return { ok: true, renders: await repo.listQuoteRenders(quoteId) };
}

export async function reorderQuoteRendersAction(quoteId: string, orderedIds: string[]): Promise<RenderActionResult> {
  await requireRepSession();
  const repo = await getRepo();
  await repo.reorderQuoteRenders(quoteId, orderedIds);
  return { ok: true, renders: await repo.listQuoteRenders(quoteId) };
}

/** Removes the row AND the blob. */
export async function deleteQuoteRenderAction(quoteId: string, renderId: string): Promise<RenderActionResult> {
  await requireRepSession();
  const repo = await getRepo();
  const mine = (await repo.listQuoteRenders(quoteId)).some((r) => r.id === renderId);
  if (!mine) return { ok: false, error: "Render not found." };
  const removed = await repo.deleteQuoteRender(renderId);
  if (removed) await deleteDocument(removed.url);
  return { ok: true, renders: await repo.listQuoteRenders(quoteId) };
}
