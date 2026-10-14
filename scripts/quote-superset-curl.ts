/**
 * Prints the QUOTE superset sample as a curl, built from the REAL dispatch
 * code: it drives quote.created / sent / accepted / updated (total, and a
 * decline with reason + detail) through dispatchQuoteToGhl against the
 * in-memory repo, captures each outbound payload, and merges them (every key
 * from every event, populated). Fire it at the object-workflow endpoint to
 * remap once. Run: GHL_OBJECT_WORKFLOW_URL=https://… npx tsx scripts/quote-superset-curl.ts
 */
delete process.env.DATABASE_URL;
process.env.GHL_WEBHOOK_URL_QUOTE = "http://ghl.test/quote";

const captured: Record<string, unknown>[] = [];
globalThis.fetch = (async (_u: string, init?: { body?: string }) => {
  captured.push(JSON.parse(init!.body!));
  return new Response("ok");
}) as typeof fetch;

async function main() {
  const { getRepo } = await import("@/lib/app/repo");
  const { saveQuote, declineQuote } = await import("@/lib/app/quotes/transitions");
  const { dispatchQuoteToGhl } = await import("@/lib/app/ghl/dispatch-quote");
  const repo = await getRepo();

  const lead = await repo.createLead({
    leadType: "ELECTRICAL", name: "Sample Customer", phone: "5555550100", email: "sample@example.com",
    propertyAddress: "123 Sample St", details: {} as never, smsConsentTransactional: true, smsConsentPromotional: false,
  });
  await repo.updateLeadGhlIds(lead.id, { ghlContactId: "ghl_contact_sample", ghlSalesOpportunityId: "ghl_opp_sample" });

  const saved = await saveQuote({
    status: "SENT", leadId: lead.id, customerName: "Sample Customer", customerPhone: "5555550100",
    customerEmail: "sample@example.com", customerAddress: "123 Sample St", message: "", notes: "", discount: 0, scopeOfWork: "",
    lineItems: [{ catalogItemId: null, name: "Item", description: null, qty: 1, unitPrice: 1250, cost: 100, taxable: false }],
  }); // → quote.created + quote.sent
  await declineQuote({ quoteId: saved.id, source: "customer", reason: "PRICE_TOO_HIGH", detail: "Found a lower bid." }); // → quote.updated (status/declined)
  const quote = (await repo.getQuote(saved.id))!;
  await dispatchQuoteToGhl(quote, { event: "ACCEPTED", source: "customer" }); // shape only; real accept happens before a decline
  await dispatchQuoteToGhl(quote, { event: "UPDATED", reason: "total", notify: true, source: "rep" });

  const merged: Record<string, unknown> = {};
  for (const payload of captured) for (const [key, value] of Object.entries(payload)) {
    if (value !== null && value !== undefined && value !== "") merged[key] = value;
  }
  // `event` varies per call; the superset carries the richest event and notes the rest for mapping.
  merged.event = "quote.updated";
  merged.reason = "status";
  merged.notify = false;
  merged.source = "customer";
  merged.status = "DECLINED";
  merged.quoteId = quote.id;

  const url = process.env.GHL_OBJECT_WORKFLOW_URL ?? "$GHL_OBJECT_WORKFLOW_URL";
  console.log(`curl -X POST '${url}' \\\n  -H 'Content-Type: application/json' \\\n  -d '${JSON.stringify(merged, null, 2).replace(/'/g, "'\\''")}'`);
  console.error(`\n# events captured: ${captured.map((c) => c.event).join(", ")}`);
}
main().catch((e) => { console.error(e); process.exit(1); });
