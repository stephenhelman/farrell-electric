import { NextResponse } from "next/server";
import { randomUUID, timingSafeEqual } from "node:crypto";
import { getRepo } from "@/lib/app/repo";
import { advanceJobLifecycle, type AdvanceResult } from "@/lib/app/jobs/gates";
import { buildJobEventPatch, isJobAction, type JobAction } from "@/lib/app/jobs/inbound";

/**
 * Inbound GHL → server callback (§1). GHL reports the ids it minted for a
 * lead/quote signal; this endpoint correlates dbId and writes them onto the
 * DB mirror row. The DB stays the system of record — this only ever backfills
 * linkage ids, never anything GHL "decided" about the underlying entity.
 *
 * Verification is a shared secret carried in a header (GHL's workflow action
 * lets you attach a static custom header) rather than a request-signing
 * scheme GHL doesn't support out of the box. Unverified requests are
 * rejected outright — there is no "warn and continue" path for inbound.
 *
 * type "lead" (New Lead echo-back) writes ghlContactId + ghlSalesOpportunityId;
 * type "lead_ops" (close echo-back, live once the Ops pipeline exists) writes
 * ghlOpsOpportunityId. Both target the Lead, which owns all three GHL ids. An
 * unknown dbId is a quiet 200 no-op (the repo swallows the missing row), and
 * re-delivery just rewrites the same values.
 *
 * type "job" carries a lifecycle `action` instead of ids (contract signed,
 * deposit paid, install scheduled, installed, final paid). Those are written
 * to the Job as facts, idempotently — see lib/app/jobs/inbound.ts. Whether a
 * deal closes or a job completes is decided separately by the lifecycle gates.
 */
const SECRET_HEADER = "x-ghl-webhook-secret";

/**
 * New Lead echo-back: GHL's New Lead workflow minted a contact and a
 * Sales-pipeline opportunity. The Lead owns all GHL ids; quotes/jobs read them
 * through it.
 */
interface LeadIdsPayload {
  type: "lead";
  dbId: string;
  ghlContactId?: string;
  ghlSalesOpportunityId?: string;
}

/**
 * Close echo-back: GHL created the Operations-pipeline opportunity when the
 * deal closed. Keyed on the LEAD dbId — the ops opp is stored on the Lead, not
 * the Job. Named for what it carries, not the trigger.
 */
interface LeadOpsPayload {
  type: "lead_ops";
  dbId: string;
  ghlOpsOpportunityId: string;
}

/** Quote mirror ids. The opportunity id is NOT a quote field — it lives on the Lead. */
interface QuoteIdsPayload {
  type: "quote";
  dbId: string;
  ghlContactId?: string;
  ghlCustomObjectId?: string;
}

interface JobEventPayload {
  type: "job";
  dbId: string;
  action: JobAction;
  /** ISO timestamp the event happened in GHL; defaults to receipt time. */
  occurredAt?: string;
  /** ISO date of the install itself — required for install_scheduled. */
  scheduledDate?: string;
}

type InboundPayload = LeadIdsPayload | LeadOpsPayload | QuoteIdsPayload | JobEventPayload;

type Log = (message: string, data?: unknown) => void;

/** Null when the request is trusted; otherwise why not (for the log only — the response is always a bare 401). */
function verifyFailure(request: Request): string | null {
  const secret = process.env.GHL_WEBHOOK_SECRET;
  if (!secret) return "GHL_WEBHOOK_SECRET is not set on the server"; // unset means "reject everything" — no secret, no trust.

  const provided = request.headers.get(SECRET_HEADER);
  if (!provided) return `missing ${SECRET_HEADER} header`;

  const secretBuf = Buffer.from(secret);
  const providedBuf = Buffer.from(provided);
  if (secretBuf.length !== providedBuf.length) {
    // Lengths only, never the values — a length mismatch usually means stray whitespace/quotes in GHL's header value.
    return `secret mismatch (length ${providedBuf.length}, expected ${secretBuf.length})`;
  }
  return timingSafeEqual(secretBuf, providedBuf) ? null : "secret mismatch";
}

function isValidDate(value: unknown): value is string {
  return typeof value === "string" && !Number.isNaN(new Date(value).getTime());
}

function isValidPayload(value: unknown): value is InboundPayload {
  if (typeof value !== "object" || value === null) return false;
  const payload = value as Record<string, unknown>;
  if (typeof payload.dbId !== "string" || payload.dbId.trim() === "") return false;

  if (payload.type === "job") {
    if (!isJobAction(payload.action)) return false;
    if (payload.occurredAt !== undefined && !isValidDate(payload.occurredAt)) return false;
    if (payload.scheduledDate !== undefined && !isValidDate(payload.scheduledDate)) return false;
    if (payload.action === "install_scheduled" && payload.scheduledDate === undefined) return false;
    return true;
  }

  if (payload.type === "lead_ops") {
    return typeof payload.ghlOpsOpportunityId === "string" && payload.ghlOpsOpportunityId.trim() !== "";
  }

  if (payload.type === "lead") {
    if (payload.ghlContactId !== undefined && typeof payload.ghlContactId !== "string") return false;
    if (payload.ghlSalesOpportunityId !== undefined && typeof payload.ghlSalesOpportunityId !== "string") return false;
    return true;
  }

  if (payload.type === "quote") {
    if (payload.ghlContactId !== undefined && typeof payload.ghlContactId !== "string") return false;
    if (payload.ghlCustomObjectId !== undefined && typeof payload.ghlCustomObjectId !== "string") return false;
    return true;
  }

  return false;
}

/**
 * Every request gets a short id and a received → outcome → responded trail in
 * the server log, so a GHL test delivery (e.g. through ngrok) can be followed
 * end to end. Logs payload ids and outcomes only — never the secret value.
 */
export async function POST(request: Request) {
  const rid = randomUUID().slice(0, 8);
  const startedAt = Date.now();
  const log: Log = (message, data) =>
    console.log(`[api/webhooks/ghl] ${rid} ${message}`, ...(data === undefined ? [] : [JSON.stringify(data)]));

  log("received", {
    contentType: request.headers.get("content-type"),
    userAgent: request.headers.get("user-agent"),
    secretHeaderPresent: request.headers.has(SECRET_HEADER),
  });

  const response = await handle(request, log);
  log(`responded ${response.status}`, { ms: Date.now() - startedAt });
  return response;
}

async function handle(request: Request, log: Log): Promise<NextResponse> {
  const failure = verifyFailure(request);
  if (failure) {
    log(`REJECTED unauthorized: ${failure}`);
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  log("secret verified");

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    log("REJECTED body is not valid JSON");
    return NextResponse.json({ ok: false, error: "Invalid request body." }, { status: 400 });
  }
  log("body", body);

  if (!isValidPayload(body)) {
    log("REJECTED invalid payload (check type, dbId, and field types/required fields for that type)");
    return NextResponse.json({ ok: false, error: "Invalid payload." }, { status: 400 });
  }

  const repo = await getRepo();
  log(`handling type=${body.type} dbId=${body.dbId}`);

  if (body.type === "job") {
    let advanced: AdvanceResult = { closed: false, completed: false };
    try {
      const job = await repo.getJob(body.dbId);
      if (!job) {
        // A job id that doesn't exist will never become valid — 200 so GHL doesn't retry, loud log so a misconfig is visible.
        log(`IGNORED ${body.action}: unknown job ${body.dbId}`);
        return NextResponse.json({ ok: true, ignored: "job not found" }, { status: 200 });
      }

      const patch = buildJobEventPatch(
        job,
        body.action,
        body.occurredAt ? new Date(body.occurredAt) : new Date(),
        body.scheduledDate ? new Date(body.scheduledDate) : null,
      );

      // An empty patch means the fact is already recorded: a re-delivery, a clean no-op.
      if (Object.keys(patch).length > 0) {
        await repo.updateJob(job.id, patch);
        log(`job ${body.action}: wrote`, { fields: Object.keys(patch) });
      } else {
        log(`job ${body.action}: already recorded — no-op (re-delivery)`);
      }

      // The gates run AFTER the field write — and on re-deliveries too — so
      // they judge the stored flags and any event order works. They are
      // exactly-once via the claimJob* guards, so re-checking is always safe.
      advanced = await advanceJobLifecycle(repo, job.id);
      log("lifecycle gates", advanced);
    } catch (error) {
      // 500 so GHL redelivers; every step above is idempotent.
      console.error("[api/webhooks/ghl] failed to write job event", error);
      log("FAILED job write (500, GHL should retry)", { error: String(error) });
      return NextResponse.json({ ok: false, error: "Write failed." }, { status: 500 });
    }

    return NextResponse.json({ ok: true, ...advanced }, { status: 200 });
  }

  try {
    if (body.type === "quote") {
      const before = await repo.getQuote(body.dbId);
      if (!before) {
        log(`IGNORED unknown quote ${body.dbId}`);
        return NextResponse.json({ ok: true, ignored: "quote not found" }, { status: 200 });
      }
      await repo.updateQuoteGhlIds(body.dbId, {
        ...(body.ghlContactId !== undefined && { ghlContactId: body.ghlContactId }),
        ...(body.ghlCustomObjectId !== undefined && { ghlCustomObjectId: body.ghlCustomObjectId }),
      });
      const after = await repo.getQuote(body.dbId);
      const pick = (q: typeof before | null) => ({ ghlContactId: q?.ghlContactId, ghlCustomObjectId: q?.ghlCustomObjectId });
      log("quote ids", { before: pick(before), after: pick(after), changed: JSON.stringify(pick(before)) !== JSON.stringify(pick(after)) });
    } else {
      const before = await repo.getLeadById(body.dbId);
      if (!before) {
        log(`IGNORED unknown lead ${body.dbId}`);
        return NextResponse.json({ ok: true, ignored: "lead not found" }, { status: 200 });
      }
      if (body.type === "lead") {
        await repo.updateLeadGhlIds(body.dbId, {
          ...(body.ghlContactId !== undefined && { ghlContactId: body.ghlContactId }),
          ...(body.ghlSalesOpportunityId !== undefined && { ghlSalesOpportunityId: body.ghlSalesOpportunityId }),
        });
      } else {
        await repo.updateLeadGhlIds(body.dbId, { ghlOpsOpportunityId: body.ghlOpsOpportunityId });
      }
      const after = await repo.getLeadById(body.dbId);
      const pick = (l: typeof before | null) => ({
        ghlContactId: l?.ghlContactId,
        ghlSalesOpportunityId: l?.ghlSalesOpportunityId,
        ghlOpsOpportunityId: l?.ghlOpsOpportunityId,
      });
      // changed=false on a repeat delivery is the idempotency proof.
      log(`${body.type} ids`, { before: pick(before), after: pick(after), changed: JSON.stringify(pick(before)) !== JSON.stringify(pick(after)) });
    }
  } catch (error) {
    log("FAILED id write (500, GHL should retry)", { error: String(error) });
    console.error("[api/webhooks/ghl] failed to write ids", error);
    return NextResponse.json({ ok: false, error: "Write failed." }, { status: 500 });
  }

  // Idempotent by construction: this is always an update-by-id (never a
  // create), so re-delivering the same callback just rewrites the same
  // values — no duplicate row, no error.
  return NextResponse.json({ ok: true }, { status: 200 });
}
