import type { LeadPayload } from "@/lib/leads/types";
import { dispatchGhlEvent } from "@/lib/ghl/dispatch";

export interface Lead {
  /** The DB-assigned id (repo.createLead's row) — rides in the lead.created payload as the round-trip linkage key. */
  leadId: string;
  payload: LeadPayload;
  submittedAt: string;
}

export interface Notifier {
  notifyNewLead(lead: Lead): Promise<void>;
}

/**
 * v1 transport: logs and no-ops. Called separately from submitLead so the
 * Sheet write and the notification fail independently — the Sheet is the
 * source of truth, notification is best-effort.
 */
export class LogNotifier implements Notifier {
  async notifyNewLead(lead: Lead): Promise<void> {
    console.log("[LogNotifier] New lead received (no-op transport):", lead);
  }
}

/**
 * Website leads (contact form + all lead forms behind app/api/leads/route.ts)
 * signal GHL via the lead.created outbound event — same seam, same
 * best-effort-non-fatal contract as LogNotifier. GHL owns contact creation +
 * pipeline entry off this signal; the app never calls the GHL API directly.
 */
export class GhlLeadNotifier implements Notifier {
  async notifyNewLead(lead: Lead): Promise<void> {
    const { payload } = lead;
    const [firstName, ...rest] = payload.name.trim().split(/\s+/);
    const lastName = rest.join(" ");

    await dispatchGhlEvent({
      event: "lead.created",
      leadId: lead.leadId,
      source: "contact_form",
      leadType: payload.type === "lighting" ? "LIGHTING" : "ELECTRICAL",
      firstName: firstName ?? payload.name,
      lastName,
      name: payload.name,
      phone: payload.phone,
      email: payload.email,
      propertyAddress: payload.propertyAddress,
      smsConsentTransactional: payload.smsConsentTransactional,
      smsConsentPromotional: payload.smsConsentPromotional,
      details: payload,
    });
  }
}

/**
 * Config-selected slot for the real channel. GHL is used once GHL_WEBHOOK_URL
 * is set (dispatchGhlEvent then actually fires); otherwise falls back to the
 * log stub so the contact form works end-to-end with zero GHL credentials.
 */
export function getNotifier(): Notifier {
  if (process.env.GHL_WEBHOOK_URL) {
    return new GhlLeadNotifier();
  }
  return new LogNotifier();
}
