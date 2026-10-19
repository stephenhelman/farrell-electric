/**
 * Prints the JOB superset sample as a curl, built from the REAL dispatch code:
 * it drives a job through its whole life against the in-memory repo —
 * job.created, job.contract_sent, job.deposit_requested, job.closed,
 * job.deposit_paid, job.balance_requested, job.completed, job.balance_paid —
 * using the real createJobForQuote / dispatchJobContractSent /
 * requestPaymentIfOwed / confirmPayment (and the lifecycle gates), captures
 * every outbound payload, and merges them: every key from every event,
 * populated. Nothing is hand-typed, so a key can't appear here that no real
 * job.* payload sends. Fire it once at GHL_WEBHOOK_URL_JOB to map every field.
 * A legend at the end says which event(s) carry each key.
 *
 * Run: GHL_WEBHOOK_URL_JOB=https://… npx tsx scripts/job-superset-curl.ts
 */
export {}; // module scope, so its top-level names never collide with the quote script

const targetUrl = process.env.GHL_WEBHOOK_URL_JOB; // the real target, only used for the printed curl
delete process.env.DATABASE_URL;
process.env.GHL_WEBHOOK_URL_JOB = "http://ghl.test/job"; // capture, never actually send
process.env.NEXT_PUBLIC_SITE_URL ??= "https://www.farrellelectric.com";

const captured: Record<string, unknown>[] = [];
globalThis.fetch = (async (_u: string, init?: { body?: string }) => {
  captured.push(JSON.parse(init!.body!));
  return new Response("ok");
}) as typeof fetch;

async function main() {
  const log = console.log;
  console.log = () => {}; // silence the app's own dispatch/no-op logging while capturing

  const { getRepo } = await import("@/lib/app/repo");
  const { saveQuote, acceptQuote } = await import("@/lib/app/quotes/transitions");
  const { createJobForQuote } = await import("@/lib/app/jobs/create");
  const { dispatchJobContractSent } = await import("@/lib/app/ghl/dispatch-job");
  const { requestPaymentIfOwed } = await import("@/lib/app/jobs/requests");
  const { confirmPayment } = await import("@/lib/app/jobs/payments");
  const repo = await getRepo();

  const lead = await repo.createLead({
    leadType: "LIGHTING", name: "Sample Customer", phone: "5555550100", email: "sample@example.com",
    propertyAddress: "123 Sample St", details: {} as never, smsConsentTransactional: true, smsConsentPromotional: false,
  });
  await repo.updateLeadGhlIds(lead.id, {
    ghlContactId: "ghl_contact_sample",
    ghlSalesOpportunityId: "ghl_sales_opp_sample",
    ghlOpsOpportunityId: "ghl_ops_opp_sample",
  });

  const saved = await saveQuote({
    status: "SENT", leadId: lead.id, customerName: "Sample Customer", customerPhone: "5555550100",
    customerEmail: "sample@example.com", customerAddress: "123 Sample St", message: "", notes: "", discount: 0,
    scopeOfWork: "• Path lighting — 12 fixtures\n• 300W transformer with timer",
    lineItems: [{ catalogItemId: null, name: "Path lighting", description: null, qty: 1, unitPrice: 3000, cost: 100, taxable: false }],
  });
  await acceptQuote(saved.id, "customer");

  // job.created (SOW render/upload stubbed so sowUrl is populated; no PDF is built)
  const made = await createJobForQuote(repo, saved.id, {
    renderSowPdf: async () => new Uint8Array([37, 80, 68, 70]),
    putDocument: async () => ({ url: "https://example.public.blob.vercel-storage.com/sow/quote-sample-AbC123.pdf" }),
  });
  if (!made.ok) throw new Error(made.error);
  const jobId = made.jobId;

  // job.contract_sent (deposit required)
  const withTerms = (await repo.sendJobContract(jobId, { paymentType: "CHECK", depositRequired: true, depositAmount: 1000 }))!;
  await dispatchJobContractSent(withTerms, (await repo.getQuote(saved.id))!);

  // job.deposit_requested
  await requestPaymentIfOwed(repo, jobId, "deposit");

  // contract signed, deposit received -> job.closed, job.deposit_paid
  await repo.updateJob(jobId, { contractStatus: "SIGNED", contractSignedAt: new Date() });
  await confirmPayment(repo, { jobId, kind: "DEPOSIT", method: "CHECK", amount: 1000, reference: "#1042", externalRef: "sample:deposit", recordedBy: "sample" });

  // installed -> job.balance_requested; balance received -> job.completed, job.balance_paid
  await repo.updateJob(jobId, { installedDate: new Date() });
  await requestPaymentIfOwed(repo, jobId, "balance");
  await confirmPayment(repo, { jobId, kind: "BALANCE", method: "ZELLE", amount: 2000, reference: "sample memo", externalRef: "sample:balance", recordedBy: "sample" });

  console.log = log;

  const sources = new Map<string, string[]>();
  const merged: Record<string, unknown> = {};
  for (const payload of captured) {
    for (const [key, value] of Object.entries(payload)) {
      if (value !== null && value !== undefined && value !== "") merged[key] = value;
      else merged[key] ??= value;
      const events = sources.get(key) ?? [];
      events.push(String(payload.event));
      sources.set(key, events);
    }
  }
  // `event` and `kind` take several values across the real events; the superset carries one
  // representative and the legend lists them all so the workflow can branch on the real ones.
  merged.event = "job.deposit_paid";
  merged.kind = "deposit";

  const distinct = (key: string) => [...new Set(captured.filter((p) => key in p).map((p) => String(p[key])))];
  const json = JSON.stringify(merged, null, 2);
  const url = targetUrl ?? "$GHL_WEBHOOK_URL_JOB";

  console.log("# ---- job.* superset (every key from every job event, populated) ----");
  console.log(json);
  console.log("\n# ---- curl ----");
  if (!targetUrl) console.log("# GHL_WEBHOOK_URL_JOB is not set — using a placeholder. Export it (or edit the URL) before firing.");
  console.log(`curl -X POST '${url}' \\\n  -H 'Content-Type: application/json' \\\n  -d '${json.replace(/'/g, "'\\''")}'`);

  console.log("\n# ---- legend: which event(s) carry each key ----");
  const width = Math.max(...[...sources.keys()].map((k) => k.length));
  for (const [key, events] of [...sources].sort(([a], [b]) => a.localeCompare(b))) {
    const all = events.length === captured.length;
    console.log(`#   ${key.padEnd(width)}  ${all ? "ALL events" : events.join(", ")}`);
  }
  console.log(`\n# event values: ${distinct("event").join(" | ")}`);
  console.log(`# kind values:  ${distinct("kind").join(" | ")}   (lowercase on all four payment events)`);
  console.log(`# events captured, in order: ${captured.map((c) => c.event).join(", ")}`);
}
main().catch((e) => { console.error(e); process.exit(1); });
