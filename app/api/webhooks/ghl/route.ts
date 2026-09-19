import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { getRepo } from "@/lib/app/repo";

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
 */
const SECRET_HEADER = "x-ghl-webhook-secret";

interface InboundPayload {
  type: "lead" | "quote";
  dbId: string;
  ghlContactId?: string;
  ghlOpportunityId?: string;
  ghlCustomObjectId?: string;
}

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

function isValidPayload(value: unknown): value is InboundPayload {
  if (typeof value !== "object" || value === null) return false;
  const payload = value as Record<string, unknown>;
  if (payload.type !== "lead" && payload.type !== "quote") return false;
  if (typeof payload.dbId !== "string" || payload.dbId.trim() === "") return false;
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
