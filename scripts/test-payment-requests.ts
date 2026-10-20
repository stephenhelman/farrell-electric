/**
 * Post-audit behaviour test: send-once payment requests, premature-operation
 * guards, and the /q totals display. In-memory repo, fetch captured.
 * Run: npx tsx scripts/test-payment-requests.ts
 */
import assert from "node:assert/strict";
import Module from "node:module";

delete process.env.DATABASE_URL;
delete process.env.BLOB_READ_WRITE_TOKEN;
process.env.GHL_WEBHOOK_URL_JOB = "http://ghl.test/job";
process.env.GHL_WEBHOOK_URL_QUOTE = "http://ghl.test/quote";
delete process.env.GHL_WEBHOOK_URL_LEAD;
process.env.GHL_WEBHOOK_SECRET = "test-secret";
process.env.NEXT_PUBLIC_SITE_URL ??= "https://farrellelectric.test";

// CSS modules aren't loadable under tsx; a class-name proxy is enough to render markup.
(Module as unknown as { _extensions: Record<string, (m: { exports: unknown }) => void> })._extensions[".css"] = (m) => {
  m.exports = new Proxy({}, { get: (_t, key) => (key === "__esModule" ? undefined : String(key)) });
};

const sent: Record<string, unknown>[] = [];
globalThis.fetch = (async (_url: string, init?: { body?: string }) => {
  sent.push(JSON.parse(init!.body!));
  return new Response("ok");
}) as typeof fetch;
const events = () => sent.splice(0, sent.length).map((p) => p.event);

(globalThis as unknown as { React?: unknown }).React ??= require("react");

async function main() {
  const { getRepo } = await import("@/lib/app/repo");
  const { saveQuote, acceptQuote } = await import("@/lib/app/quotes/transitions");
  const { createJobForQuote } = await import("@/lib/app/jobs/create");
  const { POST } = await import("@/app/api/webhooks/ghl/route");
  const { requestCurrentPayment, requestPaymentIfOwed } = await import("@/lib/app/jobs/requests");
  const { markJobInstalled } = await import("@/lib/app/jobs/install");
  const { confirmPayment } = await import("@/lib/app/jobs/payments");
  const { manualPaymentBlockedReason } = await import("@/lib/app/jobs/manual-payment");
  const repo = await getRepo();

  const lead = await repo.createLead({
    leadType: "ELECTRICAL", name: "Test Lead", phone: "5555550100", email: "t@example.com",
    propertyAddress: "1 Main St", details: {} as never, smsConsentTransactional: true, smsConsentPromotional: false,
  });
  const q = await saveQuote({
    customerName: "Test", customerPhone: "1", customerEmail: "t@example.com", customerAddress: "1 Main",
    message: "", notes: "", discount: 0, scopeOfWork: "x", leadId: lead.id, status: "SENT",
    lineItems: [{ catalogItemId: null, name: "Panel", description: null, qty: 1, unitPrice: 1000, cost: 10, taxable: false }],
  });
  await acceptQuote(q.id, "rep");
  const created = await createJobForQuote(repo, q.id, { renderSowPdf: async () => new Uint8Array(), putDocument: async () => null });
  assert.ok(created.ok);
  const jobId = created.jobId;
  await repo.sendJobContract(jobId, { depositRequired: true, depositAmount: 300 });
  events();

  const hook = async (body: Record<string, unknown>) =>
    POST(new Request("http://x/api/webhooks/ghl", {
      method: "POST",
      headers: { "x-ghl-webhook-secret": "test-secret", "content-type": "application/json" },
      body: JSON.stringify({ type: "job", dbId: jobId, ...body }),
    }));

  // 1. contract_signed whose first processing fails (gates throw) before the request.
  // Inject one DB failure inside the lifecycle-gate step (after the signature is written, before the request).
  repo.getJob = ((orig) => {
    let armed = true;
    return async (id: string) => {
      if (armed && new Error().stack?.includes("advanceJobLifecycle")) { armed = false; throw new Error("simulated DB failure"); }
      return orig(id);
    };
  })(repo.getJob.bind(repo));
  const r1 = await hook({ action: "contract_signed" });
  assert.equal(r1.status, 500, "first delivery fails");
  assert.deepEqual(events(), [], "no request sent by the failed delivery");
  assert.equal((await repo.getJob(jobId))!.contractStatus, "SIGNED", "the fact was written");

  const r2 = await hook({ action: "contract_signed" });
  assert.equal(r2.status, 200);
  assert.deepEqual(events(), ["job.deposit_requested"], "redelivery sends exactly one deposit request");
  assert.ok((await repo.getJob(jobId))!.depositRequestedAt);

  const r3 = await hook({ action: "contract_signed" });
  assert.equal(r3.status, 200);
  assert.deepEqual(events(), [], "second redelivery sends no duplicate");

  // 2. rep resend forces one and re-stamps.
  const before = (await repo.getJob(jobId))!.depositRequestedAt!;
  await new Promise((r) => setTimeout(r, 5));
  const resend = await requestCurrentPayment(repo, jobId);
  assert.equal(resend?.kind, "deposit");
  assert.deepEqual(events(), ["job.deposit_requested"], "rep resend forces a send");
  assert.ok((await repo.getJob(jobId))!.depositRequestedAt!.getTime() > before.getTime(), "marker re-stamped");
  assert.equal(await requestPaymentIfOwed(repo, jobId, "deposit"), null, "auto path still suppressed after resend");

  // 3. stray installed on an unclosed job is a no-op.
  const stray = await hook({ action: "installed" });
  assert.equal(stray.status, 200);
  assert.deepEqual(events(), [], "no events");
  let job = (await repo.getJob(jobId))!;
  assert.equal(job.installedDate, null, "installedDate not stamped");
  assert.equal(job.balanceRequestedAt, null, "no balance request");
  assert.equal((await markJobInstalled(repo, jobId, new Date())).closed, false);

  // 4. BALANCE payment on an unclosed job is rejected; DEPOSIT is allowed.
  assert.ok(manualPaymentBlockedReason(job, "BALANCE"));
  assert.equal(manualPaymentBlockedReason(job, "DEPOSIT"), null);

  // 5. deposit closes the job; installed then sends exactly one balance request, none on redelivery.
  const paid = await confirmPayment(repo, {
    jobId, kind: "DEPOSIT", method: "CHECK", amount: 300, reference: null, externalRef: "t-dep", recordedBy: "t",
  });
  assert.ok(paid.ok);
  events();
  job = (await repo.getJob(jobId))!;
  assert.ok(job.closedAt);
  assert.equal(manualPaymentBlockedReason(job, "BALANCE"), null, "balance allowed once closed");
  await hook({ action: "install_scheduled", scheduledDate: new Date(Date.now() + 86400000).toISOString() });
  events();
  await hook({ action: "installed" });
  assert.deepEqual(events(), ["job.balance_requested"]);
  await hook({ action: "installed" });
  assert.deepEqual(events(), [], "installed redelivery sends no duplicate balance request");

  // 6. /q totals: no Subtotal/Discount rows without a discount.
  const React = await import("react");
  const { renderToStaticMarkup } = await import("react-dom/server");
  const { PublicLineItems } = await import("@/components/public/PublicLineItems");
  const li = [{ name: "Panel", description: null, qty: 1, unitPrice: 1000 }];
  const render = (discount: number) =>
    renderToStaticMarkup(React.createElement(PublicLineItems, { lineItems: li, subtotal: 1000, discount, totalLabel: "Total", total: 1000 - discount }));
  const none = render(0);
  assert.ok(!none.includes("Subtotal") && !none.includes("Discount") && none.includes("Total"), "no Subtotal row at discount 0");
  const some = render(100);
  assert.ok(some.includes("Subtotal") && some.includes("Discount"), "rows shown with a discount");

  console.log("payment request / guard tests: all assertions passed");
}

main().catch((error) => { console.error(error); process.exit(1); });
