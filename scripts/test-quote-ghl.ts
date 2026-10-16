/**
 * Quote GHL-sync behaviour test. Runs against the in-memory repo (no
 * DATABASE_URL) with fetch captured, so it asserts the real payloads the real
 * dispatch code produces. Run: npx tsx scripts/test-quote-ghl.ts
 */
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";

delete process.env.DATABASE_URL;
process.env.GHL_WEBHOOK_URL_QUOTE = "http://ghl.test/quote";
process.env.GHL_WEBHOOK_URL_JOB = "http://ghl.test/job";
process.env.NEXT_PUBLIC_SITE_URL ??= "https://farrellelectric.test";

const sent: Record<string, unknown>[] = [];
globalThis.fetch = (async (_url: string, init?: { body?: string }) => {
  sent.push(JSON.parse(init!.body!));
  return new Response("ok");
}) as typeof fetch;

const take = () => sent.splice(0, sent.length);
const events = () => take().map((p) => p.event);

async function main() {
  const { getRepo } = await import("@/lib/app/repo");
  const { saveQuote, acceptQuote, declineQuote, expireQuote } = await import("@/lib/app/quotes/transitions");
  const { acceptQuoteByTokenAction, declineQuoteByTokenAction } = await import("@/app/(public)/q/[token]/actions");
  const repo = await getRepo();

  const lead = await repo.createLead({
    leadType: "ELECTRICAL", name: "Test Lead", phone: "5555550100", email: "t@example.com",
    propertyAddress: "1 Main St", details: {} as never, smsConsentTransactional: true, smsConsentPromotional: false,
  });
  const item = (unitPrice: number) => ({
    catalogItemId: null, name: "Outlet", description: null, qty: 1, unitPrice, cost: 10, taxable: false,
  });
  const base = {
    customerName: "Test", customerPhone: "1", customerEmail: "t@example.com", customerAddress: "1 Main",
    message: "", notes: "", discount: 0, scopeOfWork: "", leadId: lead.id,
  };
  const mk = async (status: "DRAFT" | "SENT", price = 100) => {
    const q = await saveQuote({ ...base, status, lineItems: [item(price)] });
    take();
    return (await repo.getQuote(q.id))!;
  };

  // every quote event carries the immutable lead id
  {
    const [q1, q2, q3, q4] = [await mk("SENT"), await mk("SENT"), await mk("SENT"), await mk("SENT")];
    await acceptQuote(q1.id, "rep");
    await declineQuote({ quoteId: q2.id, source: "rep", reason: "TIMING", detail: "" });
    await expireQuote(q3.id, false);
    await saveQuote({ ...base, id: q4.id, status: "SENT", lineItems: [item(2)] });
    await saveQuote({ ...base, status: "SENT", lineItems: [item(1)] });
    const all = take();
    assert.deepEqual(all.map((e) => e.event), ["quote.accepted", "quote.updated", "quote.updated", "quote.updated", "quote.created", "quote.sent"]);
    assert.ok(all.every((e) => e.leadId === lead.id), "all quote events carry leadId");
  }

  // --- save semantics -------------------------------------------------
  const first = await saveQuote({ ...base, status: "SENT", lineItems: [item(100)] });
  assert.deepEqual(events(), ["quote.created", "quote.sent"], "first SENT save: created then sent");

  const q = (await repo.getQuote(first.id))!;
  await saveQuote({ ...base, id: q.id, status: "SENT", lineItems: [item(100)] });
  assert.deepEqual(events(), [], "re-save of SENT with no total change: silent (sent is transition-only)");

  await saveQuote({ ...base, id: q.id, status: "SENT", lineItems: [item(250)] }, { notify: true });
  let [p] = take();
  assert.equal(p.event, "quote.updated");
  assert.equal(p.reason, "total"); assert.equal(p.notify, true); assert.equal(p.source, "rep");
  assert.equal(p.total, 250);
  assert.equal(p.declineReason, null);

  await saveQuote({ ...base, id: q.id, status: "SENT", lineItems: [item(300)] });
  [p] = take();
  assert.equal(p.notify, false, "notify defaults off unless explicitly true");

  const draft = await mk("DRAFT");
  await saveQuote({ ...base, id: draft.id, status: "DRAFT", lineItems: [item(999)] });
  assert.deepEqual(events(), [], "draft total edit is silent");
  await saveQuote({ ...base, id: draft.id, status: "SENT", lineItems: [item(999)] });
  assert.deepEqual(events(), ["quote.sent"], "DRAFT→SENT fires sent once, no updated");

  // --- ONE accept path; source differs; no quote.updated on accept ------
  const a = await mk("SENT");
  const aRep = await acceptQuote(a.id, "rep");
  assert.deepEqual(aRep, { ok: true, transitioned: true });
  const accRep = take();
  assert.deepEqual(accRep.map((x) => x.event), ["quote.accepted"]);
  assert.equal(accRep[0].source, "rep");

  const b = await mk("SENT");
  assert.equal((await acceptQuoteByTokenAction(b.publicToken!)).ok, true);
  const accCust = take();
  assert.deepEqual(accCust.map((x) => x.event), ["quote.accepted"], "customer accept: quote.accepted, NOT quote.updated");
  assert.equal(accCust[0].source, "customer");
  assert.deepEqual(Object.keys(accRep[0]).sort(), Object.keys(accCust[0]).sort(), "same payload shape");
  assert.deepEqual({ ...accRep[0], source: "", quoteId: "", quoteNumber: 0, publicQuoteUrl: "" }, { ...accCust[0], source: "", quoteId: "", quoteNumber: 0, publicQuoteUrl: "" });
  assert.equal(await repo.ensureJobForQuote(b.id) !== null, true);
  assert.equal(await repo.getQuote(b.id).then((x) => x!.status), "ACCEPTED");

  // idempotent: second click / rep after customer = clean no-op, single event
  assert.equal((await acceptQuoteByTokenAction(b.publicToken!)).ok, true);
  assert.deepEqual(events(), [], "re-accept fires nothing");
  assert.deepEqual(await acceptQuote(b.id, "rep"), { ok: true, transitioned: false });
  assert.deepEqual(events(), []);
  const j1 = await repo.ensureJobForQuote(b.id);
  assert.equal(j1, await repo.ensureJobForQuote(b.id), "job creation is idempotent");

  // customer accept does NOT create the job
  const c = await mk("SENT");
  await acceptQuoteByTokenAction(c.publicToken!); take();
  assert.equal((await repo.listJobs()).some((j) => j.quoteNumber === c.number), false, "public accept creates no job");

  // customer can't act on a draft or closed quote
  const d = await mk("DRAFT");
  assert.equal(d.publicToken, null, "a draft has no public token, so a customer can't reach it");
  const dec = await mk("SENT");
  await declineQuote({ quoteId: dec.id, source: "rep", reason: "TIMING", detail: "" }); take();
  assert.equal((await acceptQuoteByTokenAction(dec.publicToken!)).ok, false, "can't accept a declined quote");
  assert.equal((await acceptQuoteByTokenAction("no-such-token")).ok, false);

  // --- ONE decline path -------------------------------------------------
  const e = await mk("SENT");
  const r1 = await declineQuoteByTokenAction(e.publicToken!, "PRICE_TOO_HIGH", " too pricey ");
  assert.equal(r1.ok, true);
  [p] = take();
  assert.equal(p.event, "quote.updated"); assert.equal(p.reason, "status"); assert.equal(p.status, "DECLINED");
  assert.equal(p.source, "customer"); assert.equal(p.notify, false);
  assert.equal(p.declineReason, "PRICE_TOO_HIGH"); assert.equal(p.declineReasonDetail, "too pricey");
  const stored = (await repo.getQuote(e.id))!;
  assert.equal(stored.declineReason, "PRICE_TOO_HIGH"); assert.equal(stored.declineReasonDetail, "too pricey");
  assert.equal((await declineQuoteByTokenAction(e.publicToken!, "TIMING", "")).ok, true);
  assert.deepEqual(events(), [], "re-decline is a no-op");

  assert.equal((await declineQuoteByTokenAction((await mk("SENT")).publicToken!, "NO_RESPONSE", "")).ok, false, "public can't use NO_RESPONSE");
  assert.equal((await declineQuoteByTokenAction((await mk("SENT")).publicToken!, "OTHER", "  ")).ok, false, "OTHER needs detail");
  assert.equal((await declineQuoteByTokenAction((await mk("SENT")).publicToken!, "BOGUS", "")).ok, false);
  assert.deepEqual(events(), []);

  const f = await mk("SENT");
  assert.equal((await declineQuote({ quoteId: f.id, source: "rep", reason: "NO_RESPONSE", detail: "", notify: false })).ok, true);
  [p] = take();
  assert.equal(p.source, "rep"); assert.equal(p.notify, false); assert.equal(p.declineReason, "NO_RESPONSE");
  const g = await mk("SENT");
  await declineQuote({ quoteId: g.id, source: "rep", reason: "TIMING", detail: "", notify: true });
  assert.equal(take()[0].notify, true, "rep may override notify on decline");
  const h = await mk("SENT");
  await declineQuote({ quoteId: h.id, source: "customer", reason: "TIMING", detail: "", notify: true });
  assert.equal(take()[0].notify, false, "customer decline is hard-false even if notify:true is passed");

  // accepted can't be declined
  assert.equal((await declineQuote({ quoteId: a.id, source: "rep", reason: "TIMING", detail: "" })).ok, false);

  // --- expire -----------------------------------------------------------
  const x = await mk("SENT");
  assert.equal((await expireQuote(x.id, true)).ok, true);
  [p] = take();
  assert.equal(p.status, "EXPIRED"); assert.equal(p.reason, "status"); assert.equal(p.notify, true); assert.equal(p.source, "rep");
  assert.equal(p.declineReason, null);
  assert.equal((await expireQuote((await mk("DRAFT")).id, true)).ok, false, "only SENT can expire");
  await assert.rejects(saveQuote({ ...base, id: x.id, status: "DRAFT", lineItems: [item(1)] }), /can no longer be edited/);

  // --- source can't be spoofed -----------------------------------------
  for (const file of ["app/app-portal/quotes/actions.ts", "app/(public)/q/[token]/actions.ts"]) {
    const src = readFileSync(file, "utf8");
    const sigs = [...src.matchAll(/export async function \w+\(([^)]*)\)/g)].map((m) => m[1]);
    assert.ok(sigs.length > 0);
    assert.ok(sigs.every((s) => !/source/i.test(s)), `${file}: no exported action accepts source`);
  }
  const repSrc = readFileSync("app/app-portal/quotes/actions.ts", "utf8");
  const bodies = repSrc.split(/export async function /).slice(1);
  for (const b of bodies) {
    assert.match(b.split("\n").slice(0, 12).join("\n"), /await requireRepSession\(\)/, `rep action missing session check: ${b.split("(")[0]}`);
  }
  assert.doesNotMatch(readFileSync("app/(public)/q/[token]/actions.ts", "utf8"), /"rep"/, "public actions never mention source rep");

  // --- payments: ONE converged confirm path ------------------------------
  {
    const { confirmPayment } = await import("@/lib/app/jobs/payments");
    const { balanceDue } = await import("@/lib/app/jobs/lifecycle");
    const pq = await mk("SENT", 1000);
    await acceptQuote(pq.id, "rep"); take();
    const jobId = (await repo.ensureJobForQuote(pq.id))!;
    await repo.sendJobContract(jobId, { paymentType: "ZELLE", depositRequired: true, depositAmount: 300 });
    await repo.updateJob(jobId, { contractStatus: "SIGNED", contractSignedAt: new Date(), installedDate: new Date() });
    take();

    const fresh = (await repo.getJob(jobId))!;
    assert.equal(balanceDue(fresh), 1000, "a required-but-unpaid deposit does not reduce balanceDue");

    const dep = { jobId, kind: "DEPOSIT" as const, method: "CHECK" as const, amount: 300, reference: "#1042", externalRef: "manual:d1", recordedBy: "rep-1" };
    const r1 = await confirmPayment(repo, dep);
    assert.ok(r1.ok && r1.recorded, "deposit recorded");
    let j = (await repo.getJob(jobId))!;
    assert.equal(j.depositPaid, true); assert.ok(j.depositPaidAt);
    assert.equal(j.finalInvoicePaid, false);
    assert.equal(balanceDue(j), 700, "balanceDue = revenue - sum(payments)");
    assert.equal(await repo.sumPaymentsForJob(jobId), 300);
    const depEvents = take();
    assert.deepEqual(depEvents.map((e) => e.event), ["job.closed", "job.deposit_paid"], "gate then payment event");
    const depPayload = depEvents[1];
    assert.equal(depPayload.kind, "DEPOSIT"); assert.equal(depPayload.amountPaid, 300);
    assert.equal(depPayload.method, "CHECK"); assert.equal(depPayload.balanceRemaining, 700);
    assert.equal(depPayload.leadId, lead.id);
    assert.ok(j.closedAt && !j.completedAt);

    // a redelivery (same externalRef) is a clean no-op: no second row, no second event
    const r2 = await confirmPayment(repo, dep);
    assert.ok(r2.ok && !r2.recorded && r2.payment.id === (r1.ok && r1.payment.id));
    assert.deepEqual(events(), [], "redelivered externalRef fires nothing");
    assert.equal((await repo.listPaymentsForJob(jobId)).length, 1);
    assert.equal(await repo.sumPaymentsForJob(jobId), 300);

    // the balance payment clears the balance, sets finalInvoicePaid, trips the complete gate
    const r3 = await confirmPayment(repo, { jobId, kind: "BALANCE", method: "ZELLE", amount: 700, reference: "memo", externalRef: "qbo:b1", recordedBy: "quickbooks" });
    assert.ok(r3.ok && r3.recorded);
    j = (await repo.getJob(jobId))!;
    assert.equal(j.finalInvoicePaid, true); assert.ok(j.finalInvoicePaidAt);
    assert.equal(balanceDue(j), 0);
    assert.ok(j.completedAt && j.status === "DONE", "complete gate tripped");
    const balEvents = take();
    assert.deepEqual(balEvents.map((e) => e.event), ["job.completed", "job.balance_paid"]);
    assert.equal(balEvents[1].kind, "BALANCE"); assert.equal(balEvents[1].balanceRemaining, 0);

    // economics wall: nothing but the agreed keys
    for (const payload of [depPayload, balEvents[1]]) {
      assert.deepEqual(Object.keys(payload).sort(), [
        "amountPaid", "balanceRemaining", "event", "ghlContactId", "ghlOpsOpportunityId", "jobId",
        "kind", "leadId", "method", "paidAt", "quoteId", "quoteNumber",
      ]);
    }

    // partial deposit: recorded in the ledger, but sets no flag, closes nothing, fires nothing
    const sq = await mk("SENT", 1000);
    await acceptQuote(sq.id, "rep"); take();
    const sJob = (await repo.ensureJobForQuote(sq.id))!;
    await repo.sendJobContract(sJob, { paymentType: "CHECK", depositRequired: true, depositAmount: 300 });
    await repo.updateJob(sJob, { contractStatus: "SIGNED", contractSignedAt: new Date() });
    take();
    const part = { jobId: sJob, kind: "DEPOSIT" as const, method: "CHECK" as const, reference: null, recordedBy: "rep-1" };
    const p1 = await confirmPayment(repo, { ...part, amount: 100, externalRef: "manual:p1" });
    assert.ok(p1.ok && p1.recorded);
    let sj = (await repo.getJob(sJob))!;
    assert.equal(sj.depositPaid, false, "partial deposit does not set depositPaid");
    assert.equal(sj.closedAt, null, "partial deposit does not close the job");
    assert.equal(sj.amountPaid, 100);
    assert.deepEqual(events(), [], "partial deposit fires no job.deposit_paid");
    const p2 = await confirmPayment(repo, { ...part, amount: 200, externalRef: "manual:p2" });
    assert.ok(p2.ok && p2.recorded);
    sj = (await repo.getJob(sJob))!;
    assert.equal(sj.depositPaid, true, "second deposit reaching depositAmount sets depositPaid");
    assert.ok(sj.closedAt, "and trips the Closed gate");
    const sEvents = take();
    assert.deepEqual(sEvents.map((e) => e.event), ["job.closed", "job.deposit_paid"]);
    assert.equal(sEvents[1].amountPaid, 200); assert.equal(sEvents[1].balanceRemaining, 700);
    // redelivering the first partial after completion changes nothing
    await confirmPayment(repo, { ...part, amount: 100, externalRef: "manual:p1" });
    assert.deepEqual(events(), []);

    // manual-payment validation: CARD is never recordable by hand
    const { validateMarkPaid, MANUAL_PAYMENT_METHODS } = await import("@/lib/app/jobs/manual-payment");
    assert.ok(!(MANUAL_PAYMENT_METHODS as readonly string[]).includes("CARD"), "CARD not offered");
    const mp = { kind: "DEPOSIT", method: "CHECK", amount: 10 };
    assert.equal(validateMarkPaid({ ...mp, method: "CARD" }).ok, false, "manual CARD rejected");
    assert.equal(validateMarkPaid({ ...mp, amount: 0 }).ok, false);
    assert.equal(validateMarkPaid({ ...mp, amount: -5 }).ok, false);
    assert.equal(validateMarkPaid({ ...mp, kind: "REFUND" }).ok, false);
    assert.equal(validateMarkPaid({ ...mp, paidAt: "not-a-date" }).ok, false);
    assert.equal(validateMarkPaid({ ...mp, idempotencyKey: "x" }).ok, false);
    for (const method of ["CHECK", "ZELLE", "CASH", "FINANCING", "OTHER"]) assert.equal(validateMarkPaid({ ...mp, method }).ok, true);

    // the rep action authenticates first
    const jobsActions = readFileSync("app/app-portal/jobs/actions.ts", "utf8");
    const markBody = jobsActions.split("export async function markPaidAction")[1];
    assert.match(markBody.split("\n").slice(0, 3).join("\n"), /await requireRepSession\(\)/, "markPaidAction checks the session first");

    // validation
    assert.equal((await confirmPayment(repo, { ...dep, amount: 0, externalRef: "x1" })).ok, false);
    assert.equal((await confirmPayment(repo, { ...dep, jobId: "nope", externalRef: "x2" })).ok, false);
    assert.deepEqual(events(), []);
  }

  console.log("quote ghl sync: all assertions passed");

}
main().catch((e) => { console.error(e); process.exit(1); });
