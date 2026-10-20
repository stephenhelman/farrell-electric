/**
 * Quote GHL-sync behaviour test. Runs against the in-memory repo (no
 * DATABASE_URL) with fetch captured, so it asserts the real payloads the real
 * dispatch code produces. Run: npx tsx scripts/test-quote-ghl.ts
 */
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";

delete process.env.DATABASE_URL;
delete process.env.BLOB_READ_WRITE_TOKEN;
process.env.GHL_WEBHOOK_URL_QUOTE = "http://ghl.test/quote";
process.env.GHL_WEBHOOK_URL_JOB = "http://ghl.test/job";
process.env.GHL_WEBHOOK_SECRET = "test-secret";
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
  assert.equal((await repo.ensureJobForQuote(b.id))?.created, true, "first ensure creates");
  assert.equal(await repo.getQuote(b.id).then((x) => x!.status), "ACCEPTED");

  // idempotent: second click / rep after customer = clean no-op, single event
  assert.equal((await acceptQuoteByTokenAction(b.publicToken!)).ok, true);
  assert.deepEqual(events(), [], "re-accept fires nothing");
  assert.deepEqual(await acceptQuote(b.id, "rep"), { ok: true, transitioned: false });
  assert.deepEqual(events(), []);
  const j1 = await repo.ensureJobForQuote(b.id);
  const j2 = await repo.ensureJobForQuote(b.id);
  assert.equal(j1?.id, j2?.id, "job creation is idempotent");
  assert.equal(j2?.created, false, "a repeat never reports created");

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
  // every server action under app-portal authenticates first (public token actions live outside it)
  {
    const { readdirSync } = await import("node:fs");
    const walk = (dir: string): string[] =>
      readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
        e.isDirectory() ? walk(`${dir}/${e.name}`) : e.name === "actions.ts" ? [`${dir}/${e.name}`] : [],
      );
    const files = walk("app/app-portal");
    assert.ok(files.length >= 3, "found the portal action files");
    for (const file of files) {
      const parts = readFileSync(file, "utf8").split(/export async function /).slice(1);
      assert.ok(parts.length > 0, file);
      for (const body of parts) {
        assert.match(
          body.split("\n").slice(0, 12).join("\n"),
          /await requireRepSession\(\)/,
          `${file}: ${body.split("(")[0]} must call requireRepSession() first`,
        );
      }
    }
  }
  assert.doesNotMatch(readFileSync("app/(public)/q/[token]/actions.ts", "utf8"), /"rep"/, "public actions never mention source rep");

  // --- acceptance is persisted once: first acceptance wins -------------
  {
    const before = Date.now();
    const rq = await mk("SENT");
    assert.equal(rq.acceptedAt, null); assert.equal(rq.acceptedSource, null);
    await acceptQuote(rq.id, "rep"); take();
    const rAcc = (await repo.getQuote(rq.id))!;
    assert.equal(rAcc.acceptedSource, "rep");
    assert.ok(rAcc.acceptedAt && rAcc.acceptedAt.getTime() >= before, "acceptedAt set on acceptance");

    await new Promise((r) => setTimeout(r, 15));
    assert.deepEqual(await acceptQuote(rq.id, "rep"), { ok: true, transitioned: false });
    assert.deepEqual(await acceptQuote(rq.id, "customer"), { ok: true, transitioned: false });
    const rAgain = (await repo.getQuote(rq.id))!;
    assert.equal(rAgain.acceptedAt!.getTime(), rAcc.acceptedAt!.getTime(), "re-accept never moves acceptedAt");
    assert.equal(rAgain.acceptedSource, "rep", "a later accept never changes the source");

    // the public token path stamps "customer" server-side (it takes no source argument)
    const cq = await mk("SENT");
    assert.equal((await acceptQuoteByTokenAction(cq.publicToken!)).ok, true); take();
    const cAcc = (await repo.getQuote(cq.id))!;
    assert.equal(cAcc.acceptedSource, "customer");
    assert.ok(cAcc.acceptedAt);
    const firstAt = cAcc.acceptedAt!.getTime();
    await new Promise((r) => setTimeout(r, 15));
    await acceptQuoteByTokenAction(cq.publicToken!);
    await acceptQuote(cq.id, "rep");
    const cAgain = (await repo.getQuote(cq.id))!;
    assert.equal(cAgain.acceptedAt!.getTime(), firstAt); assert.equal(cAgain.acceptedSource, "customer");

    // a declined quote is never stamped
    const dq = await mk("SENT");
    await declineQuote({ quoteId: dq.id, source: "rep", reason: "TIMING", detail: "" }); take();
    await acceptQuote(dq.id, "rep");
    assert.equal((await repo.getQuote(dq.id))!.acceptedAt, null);
  }

  // --- job creation: SOW PDF + job.created, exactly once ----------------
  {
    const { createJobForQuote } = await import("@/lib/app/jobs/create");
    const { buildSowInput } = await import("@/lib/app/sow/input");
    const { putDocument } = await import("@/lib/app/blob");

    let renders = 0;
    const renderSowPdf = async () => { renders++; return new Uint8Array([37, 80, 68, 70]); };
    const putOk = async () => ({ url: "https://blob.test/sow/quote-x-abc123.pdf" });

    await repo.updateLeadGhlIds(lead.id, { ghlSalesOpportunityId: "sales_opp_1", ghlOpsOpportunityId: "ops_opp_1" });
    const jq = await mk("SENT");
    await acceptQuote(jq.id, "customer"); take();
    const first = await createJobForQuote(repo, jq.id, { renderSowPdf, putDocument: putOk });
    assert.ok(first.ok && first.created && first.warning === null);
    const created = take();
    assert.deepEqual(created.map((e) => e.event), ["job.created"], "job.created fires exactly once");
    assert.deepEqual(Object.keys(created[0]).sort(), [
      "event", "ghlContactId", "ghlOpsOpportunityId", "ghlSalesOpportunityId", "jobId", "leadId", "quoteId", "quoteNumber", "sowUrl", "total", "customerName",
    ].sort(), "job.created key set is pinned — no economics");
    const sowToken = (await repo.getQuote(jq.id))!.publicToken!;
    assert.match(String(created[0].sowUrl), new RegExp(`/sow/${sowToken}$`), "payload carries the branded link");
    assert.doesNotMatch(String(created[0].sowUrl), /blob\.test/, "raw blob URL never leaves");
    assert.equal(created[0].leadId, lead.id);
    assert.equal(created[0].ghlSalesOpportunityId, "sales_opp_1", "sales opp id read through the lead");
    assert.equal(created[0].ghlOpsOpportunityId, "ops_opp_1");
    const jobRow = (await repo.getJob(first.ok ? first.jobId : ""))!;
    assert.equal(jobRow.sowUrl, "https://blob.test/sow/quote-x-abc123.pdf"); assert.ok(jobRow.sowGeneratedAt);
    // /sow/[token] redirect target: the internal blob URL; unknown token / ungenerated -> null (404)
    assert.equal(await repo.getSowBlobUrlByQuoteToken(sowToken), "https://blob.test/sow/quote-x-abc123.pdf");
    assert.equal(await repo.getSowBlobUrlByQuoteToken("no-such-token"), null);
    assert.equal(renders, 1);

    // a second call: nothing regenerated, nothing fired
    const again = await createJobForQuote(repo, jq.id, { renderSowPdf, putDocument: putOk });
    assert.ok(again.ok && !again.created && again.jobId === (first.ok && first.jobId));
    assert.deepEqual(events(), [], "repeat fires nothing"); assert.equal(renders, 1, "repeat regenerates nothing");

    // Blob token unset: the REAL putDocument returns null -> sowUrl stays null, warning, job.created still fires
    assert.equal(await putDocument("sow/x.pdf", new Uint8Array([1]), "application/pdf"), null);
    const nq = await mk("SENT"); await acceptQuote(nq.id, "rep"); take();
    const noBlob = await createJobForQuote(repo, nq.id, { renderSowPdf, putDocument });
    assert.ok(noBlob.ok && noBlob.created && noBlob.warning !== null, "warning surfaced");
    const nb = take();
    assert.deepEqual(nb.map((e) => e.event), ["job.created"], "job.created still fires without Blob");
    assert.equal(nb[0].sowUrl, null);
    assert.equal((await repo.getJob(noBlob.ok ? noBlob.jobId : ""))!.sowUrl, null);

    // render failure: non-fatal — job exists, event fires, warning returned
    const eq = await mk("SENT"); await acceptQuote(eq.id, "rep"); take();
    const origErr = console.error; console.error = () => {};
    const boom = await createJobForQuote(repo, eq.id, { renderSowPdf: async () => { throw new Error("boom"); }, putDocument: putOk });
    console.error = origErr;
    assert.ok(boom.ok && boom.created && boom.warning !== null);
    assert.deepEqual(events(), ["job.created"]);
    assert.ok(await repo.getJob(boom.ok ? boom.jobId : ""), "job survives a SOW failure");

    // Regression (Vercel MODULE_NOT_FOUND on pdfkit fonts): a synchronous throw, or an unhandled
    // rejection fired by render internals, must be contained -> warning, sowUrl null, no crash.
    for (const [label, render] of [
      ["sync throw", (() => { throw new Error("sync boom"); }) as () => Promise<Uint8Array>],
      ["stray rejection", async () => { void Promise.reject(new Error("stray")); await new Promise((r) => setTimeout(r, 20)); return new Uint8Array([1]); }],
    ] as const) {
      const rq = await mk("SENT"); await acceptQuote(rq.id, "rep"); take();
      console.error = () => {};
      const r = await createJobForQuote(repo, rq.id, { renderSowPdf: render, putDocument: putOk });
      console.error = origErr;
      assert.ok(r.ok && r.created && r.warning !== null, label);
      assert.equal((await repo.getJob(r.ok ? r.jobId : ""))!.sowUrl, null, label);
      assert.deepEqual(events(), ["job.created"], label);
    }

    // not accepted -> no job, no event
    const uq = await mk("SENT");
    assert.equal((await createJobForQuote(repo, uq.id, { renderSowPdf, putDocument: putOk })).ok, false);
    assert.deepEqual(events(), []);

    // the SOW input is economics-free and falls back for a legacy (unstamped) acceptance
    const stamped = (await repo.getQuote(jq.id))!;
    assert.doesNotMatch(JSON.stringify(buildSowInput(stamped)), /cost|profit|margin|revenue/i);
    assert.equal(buildSowInput(stamped).acceptance.source, "customer");
    const legacy = buildSowInput({ ...stamped, acceptedAt: null, acceptedSource: null });
    assert.equal(legacy.acceptance.source, "rep"); assert.ok(legacy.acceptance.acceptedAt instanceof Date);
  }

  // --- /pay context + suppression-guarded payment requests -------------
  {
    const { POST } = await import("@/app/api/webhooks/ghl/route");
    const { confirmPayment } = await import("@/lib/app/jobs/payments");
    const deliver = async (dbId: string, action: string) => {
      const res = await POST(new Request("http://app.test/api/webhooks/ghl", {
        method: "POST",
        headers: { "content-type": "application/json", "x-ghl-webhook-secret": "test-secret" },
        body: JSON.stringify({ type: "job", dbId, action }),
      }));
      assert.equal(res.status, 200, `${action} delivery accepted`);
    };
    const logSilently = async <T,>(fn: () => Promise<T>) => { const l = console.log; console.log = () => {}; try { return await fn(); } finally { console.log = l; } };
    const newJob = async (price: number, terms: { depositRequired: boolean; depositAmount: number | null }) => {
      const q = await mk("SENT", price);
      await acceptQuote(q.id, "rep"); take();
      const j = (await repo.ensureJobForQuote(q.id))!.id;
      await repo.sendJobContract(j, { ...terms });
      take();
      return { q, jobId: j };
    };

    // contract_signed, deposit owed -> job.deposit_requested (and nothing closes yet)
    const a = await newJob(1000, { depositRequired: true, depositAmount: 300 });
    const aTok = (await repo.getJob(a.jobId))!.payToken!;
    assert.ok(aTok.length >= 16, "payToken minted at job creation");
    await logSilently(() => deliver(a.jobId, "contract_signed"));
    const aEv = take();
    assert.deepEqual(aEv.map((e) => e.event), ["job.deposit_requested"]);
    assert.equal(aEv[0].kind, "deposit"); assert.equal(aEv[0].amountDue, 300);
    assert.equal(aEv[0].payUrl, `https://farrellelectric.test/pay/${aTok}`);
    assert.deepEqual(Object.keys(aEv[0]).sort(), [
      "amountDue", "event", "ghlContactId", "ghlOpsOpportunityId", "ghlSalesOpportunityId", "jobId", "kind", "leadId", "payUrl", "quoteId", "quoteNumber",
    ]);
    // a re-delivery of contract_signed records nothing new -> no second request
    await logSilently(() => deliver(a.jobId, "contract_signed"));
    assert.deepEqual(events(), [], "redelivered contract_signed sends no second request");

    // contract_signed AFTER the deposit was already paid -> no request, job closes
    const b = await newJob(1000, { depositRequired: true, depositAmount: 300 });
    await confirmPayment(repo, { jobId: b.jobId, kind: "DEPOSIT", method: "CHECK", amount: 300, reference: null, externalRef: "manual:pre", recordedBy: "rep" });
    take();
    await logSilently(() => deliver(b.jobId, "contract_signed"));
    assert.deepEqual(events(), ["job.closed"], "pre-paid deposit: no request, job closes");

    // no deposit required -> signing requests nothing
    const n = await newJob(1000, { depositRequired: false, depositAmount: null });
    await logSilently(() => deliver(n.jobId, "contract_signed"));
    assert.deepEqual(events().filter((e) => e === "job.deposit_requested"), []);

    // installed with a balance owed -> job.balance_requested for exactly what's left
    await logSilently(() => deliver(a.jobId, "installed"));
    const iEv = take();
    assert.deepEqual(iEv.map((e) => e.event), ["job.balance_requested"]);
    assert.equal(iEv[0].kind, "balance"); assert.equal(iEv[0].amountDue, 1000, "nothing paid yet, so the full balance is owed");

    // installed with nothing owed -> no request (completes instead)
    await confirmPayment(repo, { jobId: b.jobId, kind: "BALANCE", method: "ZELLE", amount: 700, reference: null, externalRef: "manual:rest", recordedBy: "rep" });
    take();
    await logSilently(() => deliver(b.jobId, "installed"));
    const dEv = take().map((e) => e.event);
    assert.ok(!dEv.includes("job.balance_requested"), "nothing owed: no balance request");
    assert.deepEqual(dEv, ["job.completed"]);

    // markJobInstalled (shared by the webhook and the in-app "Mark Installed"): claim-style
    const { markJobInstalled } = await import("@/lib/app/jobs/install");
    take();
    const backdate = new Date("2026-01-05T12:00:00Z");
    const m1 = await markJobInstalled(repo, n.jobId, backdate);
    assert.ok(m1.claimed && m1.balanceRequest?.amountDue === 1000);
    assert.deepEqual(take().map((e) => e.event), ["job.balance_requested"], "balance owed -> request");
    assert.equal((await repo.getJob(n.jobId))!.installedDate?.getTime(), backdate.getTime(), "back-dated installedDate stamped");
    const m2 = await markJobInstalled(repo, n.jobId, new Date());
    assert.ok(!m2.claimed && m2.balanceRequest === null);
    assert.deepEqual(events(), [], "re-marking is a no-op");
    assert.equal((await repo.getJob(n.jobId))!.installedDate?.getTime(), backdate.getTime(), "installedDate never moves");
    const c = await newJob(500, { depositRequired: false, depositAmount: null });
    await logSilently(() => deliver(c.jobId, "contract_signed")); take();
    await confirmPayment(repo, { jobId: c.jobId, kind: "BALANCE", method: "CHECK", amount: 500, reference: null, externalRef: "manual:c", recordedBy: "rep" }); take();
    const m3 = await markJobInstalled(repo, c.jobId, new Date());
    assert.ok(m3.claimed && m3.balanceRequest === null && m3.advanced.completed);
    assert.deepEqual(take().map((e) => e.event), ["job.completed"], "fully paid -> completes, no balance request");

    // getPayContextByToken: deposit vs balance vs nothing due, economics-free
    const ctxA = (await repo.getPayContextByToken(aTok))!;
    assert.deepEqual(ctxA.due, { kind: "deposit", amount: 300 });
    assert.equal(ctxA.referenceNumber, String(a.q.number));
    await confirmPayment(repo, { jobId: a.jobId, kind: "DEPOSIT", method: "CHECK", amount: 100, reference: "secret-ref", externalRef: "manual:a1", recordedBy: "rep" }); take();
    assert.deepEqual((await repo.getPayContextByToken(aTok))!.due, { kind: "deposit", amount: 200 }, "partial deposit leaves the remainder due");
    await confirmPayment(repo, { jobId: a.jobId, kind: "DEPOSIT", method: "CHECK", amount: 200, reference: null, externalRef: "manual:a2", recordedBy: "rep" }); take();
    assert.deepEqual((await repo.getPayContextByToken(aTok))!.due, { kind: "balance", amount: 700 }, "deposit satisfied -> balance");
    const bTok = (await repo.getJob(b.jobId))!.payToken!;
    const ctxB = (await repo.getPayContextByToken(bTok))!;
    assert.equal(ctxB.due, null, "paid in full -> nothing due");
    assert.equal(ctxB.payments.length, 2);
    assert.equal(await repo.getPayContextByToken("no-such-token"), null);
    assert.doesNotMatch(JSON.stringify(ctxA), /cost|profit|margin|revenue|secret-ref|recordedBy|reference"/i);
    assert.deepEqual(Object.keys(ctxA).sort(), ["customerName", "due", "payments", "referenceNumber", "sowUrl"]);

    // lazy mint for a job that predates payToken
    const legacyJob = (await repo.getJob(n.jobId))!;
    (await import("@/lib/app/repo/memory-store")).memoryStore.jobs.find((j) => j.id === legacyJob.id)!.payToken = null;
    const minted = await repo.ensurePayToken(legacyJob.id);
    assert.ok(minted); assert.equal(await repo.ensurePayToken(legacyJob.id), minted, "minting is idempotent");

    // the contract payload carries the deposit terms + balanceDue for GHL merge fields
    const csJob = (await repo.getJob(a.jobId))!;
    const csQuote = (await repo.getQuote(a.q.id))!;
    const { dispatchJobContractSent } = await import("@/lib/app/ghl/dispatch-job");
    await dispatchJobContractSent(csJob, csQuote);
    const cs = take()[0];
    assert.equal(cs.event, "job.contract_sent"); assert.equal(cs.leadId, lead.id, "job.contract_sent carries leadId");
    assert.equal(cs.ghlSalesOpportunityId, "sales_opp_1", "contract_sent carries the sales opp id"); assert.equal(cs.depositRequired, true);
    assert.equal(cs.depositAmount, 300); assert.equal(cs.balanceDue, 700);
    assert.ok(!("scopeOfWork" in cs) && !("paymentType" in cs), "scopeOfWork and paymentType are not sent on contract_sent");
  }

  // --- rep "Send payment request": same path + payload as the auto-trigger ---
  {
    const { requestCurrentPayment } = await import("@/lib/app/jobs/requests");
    const { confirmPayment } = await import("@/lib/app/jobs/payments");
    const KEYS = ["amountDue", "event", "ghlContactId", "ghlOpsOpportunityId", "ghlSalesOpportunityId", "jobId", "kind", "leadId", "payUrl", "quoteId", "quoteNumber"];
    const mkJob = async (terms: { depositRequired: boolean; depositAmount: number | null }) => {
      const q = await mk("SENT", 1000);
      await acceptQuote(q.id, "rep");
      const id = (await repo.ensureJobForQuote(q.id))!.id;
      await repo.sendJobContract(id, { ...terms });
      take();
      return id;
    };

    // signed job, deposit owed -> one deposit_requested (and a resend sends it again)
    const dj = await mkJob({ depositRequired: true, depositAmount: 300 });
    await repo.updateJob(dj, { contractStatus: "SIGNED", contractSignedAt: new Date() });
    assert.deepEqual(await requestCurrentPayment(repo, dj), { kind: "deposit", amountDue: 300 });
    const dEv = take();
    assert.deepEqual(dEv.map((e) => e.event), ["job.deposit_requested"]);
    assert.deepEqual(Object.keys(dEv[0]).sort(), KEYS, "same payload shape as the auto-fired request");
    assert.ok(String(dEv[0].payUrl).startsWith("https://farrellelectric.test/pay/"));
    assert.deepEqual(await requestCurrentPayment(repo, dj), { kind: "deposit", amountDue: 300 });
    assert.equal(take().length, 1, "a manual resend fires again");

    // deposit paid, installed, balance remains -> balance_requested for the remainder
    await confirmPayment(repo, { jobId: dj, kind: "DEPOSIT", method: "CHECK", amount: 300, reference: null, externalRef: "manual:r1", recordedBy: "rep" });
    await repo.updateJob(dj, { installedDate: new Date() }); take();
    assert.deepEqual(await requestCurrentPayment(repo, dj), { kind: "balance", amountDue: 700 });
    const bEv = take();
    assert.deepEqual(bEv.map((e) => e.event), ["job.balance_requested"]);
    assert.deepEqual(Object.keys(bEv[0]).sort(), KEYS);

    // no-deposit installed job -> balance for the whole amount
    const nj = await mkJob({ depositRequired: false, depositAmount: null });
    await repo.updateJob(nj, { installedDate: new Date() });
    assert.deepEqual(await requestCurrentPayment(repo, nj), { kind: "balance", amountDue: 1000 });
    assert.deepEqual(events(), ["job.balance_requested"]);

    // fully paid -> nothing sent
    await confirmPayment(repo, { jobId: dj, kind: "BALANCE", method: "ZELLE", amount: 700, reference: null, externalRef: "manual:r2", recordedBy: "rep" });
    take();
    assert.equal(await requestCurrentPayment(repo, dj), null, "nothing due -> null");
    assert.deepEqual(events(), [], "and nothing is dispatched");
    assert.equal(await requestCurrentPayment(repo, "no-such-job"), null);
  }

  // --- payments: ONE converged confirm path ------------------------------
  {
    const { confirmPayment } = await import("@/lib/app/jobs/payments");
    const { balanceDue } = await import("@/lib/app/jobs/lifecycle");
    const pq = await mk("SENT", 1000);
    await acceptQuote(pq.id, "rep"); take();
    const jobId = (await repo.ensureJobForQuote(pq.id))!.id;
    await repo.sendJobContract(jobId, { depositRequired: true, depositAmount: 300 });
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
    assert.equal(depEvents[0].leadId, lead.id, "job.closed carries leadId");
    const depPayload = depEvents[1];
    assert.equal(depPayload.kind, "deposit", "payload kind is lowercase"); assert.equal(depPayload.amountPaid, 300);
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
    assert.equal(balEvents[0].leadId, lead.id, "job.completed carries leadId");
    assert.equal(balEvents[1].kind, "balance"); assert.equal(balEvents[1].balanceRemaining, 0);

    // economics wall: nothing but the agreed keys
    for (const payload of [depPayload, balEvents[1]]) {
      assert.deepEqual(Object.keys(payload).sort(), [
        "amountPaid", "balanceRemaining", "event", "ghlContactId", "ghlOpsOpportunityId", "ghlSalesOpportunityId", "jobId",
        "kind", "leadId", "method", "paidAt", "quoteId", "quoteNumber",
      ]);
    }

    // partial deposit: recorded in the ledger, but sets no flag, closes nothing, fires nothing
    const sq = await mk("SENT", 1000);
    await acceptQuote(sq.id, "rep"); take();
    const sJob = (await repo.ensureJobForQuote(sq.id))!.id;
    await repo.sendJobContract(sJob, { depositRequired: true, depositAmount: 300 });
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
