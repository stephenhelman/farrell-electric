import { NextResponse } from "next/server";
import { getNotifier } from "@/lib/notifications/notifier";
import type { LeadPayload } from "@/lib/leads/types";
import { getRepo } from "@/lib/app/repo";
import type { LeadType } from "@/lib/app/repo/types";

function isValidPayload(value: unknown): value is LeadPayload {
  if (typeof value !== "object" || value === null) return false;
  const payload = value as Record<string, unknown>;
  if (payload.type !== "lighting" && payload.type !== "electrical") return false;
  if (typeof payload.name !== "string" || payload.name.trim() === "") return false;
  if (typeof payload.phone !== "string" || payload.phone.trim() === "") return false;
  if (typeof payload.email !== "string" || payload.email.trim() === "") return false;
  if (typeof payload.propertyAddress !== "string" || payload.propertyAddress.trim() === "") return false;
  return true;
}

/**
 * The DB write is the source of truth; notification is best-effort. This
 * handler always returns 200 so a createLead or notifier failure never
 * breaks form UX.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body." }, { status: 200 });
  }

  if (!isValidPayload(body)) {
    return NextResponse.json({ ok: false, error: "Missing required fields." }, { status: 200 });
  }

  // Consent is never required to submit — coerce anything other than a literal
  // `true` (missing, tampered, non-boolean) down to false rather than rejecting.
  const rawPayload = body as unknown as Record<string, unknown>;
  const payload: LeadPayload = {
    ...body,
    smsConsentTransactional: rawPayload.smsConsentTransactional === true,
    smsConsentPromotional: rawPayload.smsConsentPromotional === true,
  };

  let leadId: string | null = null;
  try {
    const repo = await getRepo();
    const leadType: LeadType = payload.type === "lighting" ? "LIGHTING" : "ELECTRICAL";
    const lead = await repo.createLead({
      leadType,
      name: payload.name,
      phone: payload.phone,
      email: payload.email,
      propertyAddress: payload.propertyAddress,
      details: payload,
      smsConsentTransactional: payload.smsConsentTransactional,
      smsConsentPromotional: payload.smsConsentPromotional,
    });
    leadId = lead.id;
  } catch (error) {
    console.error("[api/leads] createLead failed", error);
  }

  if (leadId) {
    try {
      await getNotifier().notifyNewLead({ leadId, payload, submittedAt: new Date().toISOString() });
    } catch (error) {
      console.error("[api/leads] notifyNewLead failed", error);
    }
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
