import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
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
 * type "job" carries a lifecycle `action` instead of ids (contract signed,
 * deposit paid, install scheduled, installed, final paid). Those are written
 * to the Job as facts, idempotently — see lib/app/jobs/inbound.ts. Whether a
 * deal closes or a job completes is decided separately by the lifecycle gates.
 */
const SECRET_HEADER = "x-ghl-webhook-secret";

interface IdsPayload {
  type: "lead" | "quote";
  dbId: string;
  ghlContactId?: string;
  ghlOpportunityId?: string;
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

type InboundPayload = IdsPayload | JobEventPayload;

function isVerified(request: Request): boolean {
  const secret = process.env.GHL_WEBHOOK_SECRET;
  if (!secret) return false; // unset means "reject everything" — no secret, no trust.

  const provided = request.headers.get(SECRET_HEADER);
  if (!provided) return false;

  const secretBuf = Buffer.from(secret);
  const providedBuf = Buffer.from(provided);
  if (secretBuf.length !== providedBuf.length) return false;
  return timingSafeEqual(secretBuf, providedBuf);
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

  if (payload.type !== "lead" && payload.type !== "quote") return false;
  if (payload.ghlContactId !== undefined && typeof payload.ghlContactId !== "string") return false;
  if (payload.ghlOpportunityId !== undefined && typeof payload.ghlOpportunityId !== "string") return false;
  if (payload.ghlCustomObjectId !== undefined && typeof payload.ghlCustomObjectId !== "string") return false;
  return true;
}

export async function POST(request: Request) {
  if (!isVerified(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body." }, { status: 400 });
  }

  if (!isValidPayload(body)) {
    return NextResponse.json({ ok: false, error: "Invalid payload." }, { status: 400 });
  }

  const repo = await getRepo();

  if (body.type === "job") {
    let advanced: AdvanceResult = { closed: false, completed: false };
    try {
      const job = await repo.getJob(body.dbId);
      if (!job) {
        // A job id that doesn't exist will never become valid — 200 so GHL doesn't retry, loud log so a misconfig is visible.
        console.error(`[api/webhooks/ghl] ${body.action} for unknown job ${body.dbId} — ignored`);
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
      }

      // The gates run AFTER the field write — and on re-deliveries too — so
      // they judge the stored flags and any event order works. They are
      // exactly-once via the claimJob* guards, so re-checking is always safe.
      advanced = await advanceJobLifecycle(repo, job.id);
    } catch (error) {
      // 500 so GHL redelivers; every step above is idempotent.
      console.error("[api/webhooks/ghl] failed to write job event", error);
      return NextResponse.json({ ok: false, error: "Write failed." }, { status: 500 });
    }

    return NextResponse.json({ ok: true, ...advanced }, { status: 200 });
  }

  try {
    if (body.type === "lead") {
      await repo.updateLeadGhlIds(body.dbId, {
        ...(body.ghlContactId !== undefined && { ghlContactId: body.ghlContactId }),
        ...(body.ghlOpportunityId !== undefined && { ghlOpportunityId: body.ghlOpportunityId }),
      });
    } else {
      await repo.updateQuoteGhlIds(body.dbId, {
        ...(body.ghlContactId !== undefined && { ghlContactId: body.ghlContactId }),
        ...(body.ghlOpportunityId !== undefined && { ghlOpportunityId: body.ghlOpportunityId }),
        ...(body.ghlCustomObjectId !== undefined && { ghlCustomObjectId: body.ghlCustomObjectId }),
      });
    }
  } catch (error) {
    console.error("[api/webhooks/ghl] failed to write ids", error);
    return NextResponse.json({ ok: false, error: "Write failed." }, { status: 500 });
  }

  // Idempotent by construction: this is always an update-by-id (never a
  // create), so re-delivering the same callback just rewrites the same
  // values — no duplicate row, no error.
  return NextResponse.json({ ok: true }, { status: 200 });
}
