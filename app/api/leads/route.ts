import { NextResponse } from "next/server";
import { submitLead } from "@/lib/leads/submitLead";
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
 * Sheet write and notification are called separately and fail independently.
 * The Sheet is the source of truth; notification is best-effort. This handler
 * always returns 200 so a Sheets or Notifier failure never breaks form UX.
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

  const payload = body;

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
    });
    leadId = lead.id;
  } catch (error) {
    console.error("[api/leads] createLead failed", error);
  }

  let sheetResult;
  try {
    sheetResult = await submitLead(payload);
  } catch (error) {
    console.error("[api/leads] submitLead failed", error);
    sheetResult = { ok: false, notified: false as const, stub: true };
  }

  if (leadId) {
    try {
      await getNotifier().notifyNewLead({ leadId, payload, submittedAt: new Date().toISOString() });
    } catch (error) {
      console.error("[api/leads] notifyNewLead failed", error);
    }
  }

  return NextResponse.json({ ok: true, sheetWritten: sheetResult.ok && !sheetResult.stub }, { status: 200 });
}
