"use server";

import { getRepo } from "@/lib/app/repo";
import type { SaveQuoteInput } from "@/lib/app/repo/types";

export async function saveQuoteAction(input: SaveQuoteInput) {
  const repo = await getRepo();
  const quote = await repo.saveQuote(input);
  return { id: quote.id, number: quote.number };
}

export async function acceptQuoteAction(id: string) {
  const repo = await getRepo();
  await repo.acceptQuote(id);
}

export async function declineQuoteAction(id: string) {
  const repo = await getRepo();
  await repo.declineQuote(id);
}
