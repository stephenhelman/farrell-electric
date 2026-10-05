"use server";

import { getRepo } from "@/lib/app/repo";
import type { SaveQuoteInput } from "@/lib/app/repo/types";
import { dispatchQuoteToGhl } from "@/lib/app/ghl/dispatch-quote";

export async function saveQuoteAction(input: SaveQuoteInput) {
  const repo = await getRepo();
  const quote = await repo.saveQuote(input);

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
