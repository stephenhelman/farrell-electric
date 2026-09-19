"use server";

import { getRepo } from "@/lib/app/repo";
import type { SaveQuoteInput } from "@/lib/app/repo/types";
import { syncQuoteToGhl } from "@/lib/app/ghl/sync-quote";

export async function saveQuoteAction(input: SaveQuoteInput) {
  const repo = await getRepo();
  const quote = await repo.saveQuote(input);

  if (quote.status === "SENT") {
    await syncQuoteToGhl(quote, "SENT");
  }

  return { id: quote.id, number: quote.number };
}

export async function acceptQuoteAction(id: string) {
  const repo = await getRepo();
  await repo.acceptQuote(id);

  const quote = await repo.getQuote(id);
  if (quote) {
    await syncQuoteToGhl(quote, "ACCEPTED");
  }
}

export async function declineQuoteAction(id: string) {
  const repo = await getRepo();
  await repo.declineQuote(id);
}
