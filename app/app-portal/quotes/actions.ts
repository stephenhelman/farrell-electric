"use server";

import { getRepo } from "@/lib/app/repo";
import type { SaveQuoteInput } from "@/lib/app/repo/types";
import { dispatchQuoteToGhl } from "@/lib/app/ghl/dispatch-quote";

export async function saveQuoteAction(input: SaveQuoteInput) {
  const repo = await getRepo();
  // A save with no id is the quote's FIRST persist — the one and only create
  // path (builder, estimator and lead-prefill all land here), so quote.created
  // fires exactly once per quote. Every later save carries the id and can
  // only ever re-fire quote.sent. Awaited in order: created, then sent.
  const isFirstSave = !input.id;
  const quote = await repo.saveQuote(input);

  if (isFirstSave) {
    await dispatchQuoteToGhl(quote, "CREATED");
  }

  if (quote.status === "SENT") {
    await dispatchQuoteToGhl(quote, "SENT");
  }

  return { id: quote.id, number: quote.number };
}

/** Returns the spawned Job's id — the caller lands the rep on the Job page. */
export async function acceptQuoteAction(id: string): Promise<string> {
  const repo = await getRepo();
  const jobId = await repo.acceptQuote(id);

  const quote = await repo.getQuote(id);
  if (quote) {
    await dispatchQuoteToGhl(quote, "ACCEPTED");
  }

  return jobId;
}

export async function declineQuoteAction(id: string) {
  const repo = await getRepo();
  await repo.declineQuote(id);
}
