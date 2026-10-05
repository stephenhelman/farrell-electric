import { NextResponse } from "next/server";
import { getNotifier } from "@/lib/notifications/notifier";
import type { LeadPayload } from "@/lib/leads/types";
import { detectBot, validateLeadSubmission } from "@/lib/leads/validation";
import { isTurnstileEnabled, verifyTurnstile } from "@/lib/leads/turnstile";
import { getRepo } from "@/lib/app/repo";
import type { LeadType } from "@/lib/app/repo/types";

/**
 * Order matters (cheapest and quietest first):
 *   1. honeypot / time-to-submit -> silent {ok:true}, nothing stored or fired
 *   2. validation + length caps  -> {ok:false, error} the form can show
 *   3. Turnstile (only if configured) -> after validation, so a visitor who
 *      fixes a typo doesn't burn their single-use token
 *   4. createLead (source of truth) -> notifier
 * Every rejection happens BEFORE createLead and any dispatch, so a rejected
 * submission creates no lead and fires no event.
 *
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

  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return NextResponse.json({ ok: false, error: "Missing required fields." }, { status: 200 });
  }
  const raw = body as Record<string, unknown>;

  const bot = detectBot(raw);
  if (bot) {
    // Looks like success to the sender. No PII in the log line.
    console.log(`[api/leads] dropped silently (${bot})`);
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  const validated = validateLeadSubmission(raw);
  if (!validated.ok) {
    return NextResponse.json({ ok: false, error: validated.error }, { status: 200 });
  }
  const payload: LeadPayload = validated.payload;

  if (isTurnstileEnabled() && (await verifyTurnstile(raw.turnstileToken)) === "failed") {
    return NextResponse.json(
      { ok: false, error: "We couldn't verify your submission. Please try again, or call or text us." },
      { status: 200 },
    );
  }

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
