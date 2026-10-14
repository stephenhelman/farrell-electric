"use server";

import { getRepo } from "@/lib/app/repo";
import { acceptQuote, declineQuote } from "@/lib/app/quotes/transitions";

// Unauthenticated by design: the unguessable public token IS the authorization.
// These endpoints stamp source "customer" as a literal; neither takes a source
// (or notify) from the caller, so a visitor can never claim to be a rep.

type Result = { ok: true } | { ok: false; error: string };

export async function acceptQuoteByTokenAction(token: string): Promise<Result> {
  const quoteId = await resolve(token);
  if (!quoteId) return { ok: false, error: "This quote isn't available." };
  const result = await acceptQuote(quoteId, "customer");
  return result.ok ? { ok: true } : result;
}

export async function declineQuoteByTokenAction(token: string, reason: string, detail: string): Promise<Result> {
  const quoteId = await resolve(token);
  if (!quoteId) return { ok: false, error: "This quote isn't available." };
  const result = await declineQuote({ quoteId, source: "customer", reason, detail });
  return result.ok ? { ok: true } : result;
}

async function resolve(token: unknown): Promise<string | null> {
  if (typeof token !== "string" || token === "") return null;
  return (await getRepo()).findQuoteIdByPublicToken(token);
}
