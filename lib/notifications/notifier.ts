import type { LeadPayload } from "@/lib/leads/types";
import { getGhlClient } from "@/lib/ghl/client";

export interface Lead {
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
 * Task 9: website leads (contact form + all lead forms behind
 * app/api/leads/route.ts) flow to GHL as contacts, same seam, same
 * best-effort-non-fatal contract as LogNotifier. GHL owns contacts/pipeline
 * per the sprint's data-ownership rules, so this only upserts the contact —
 * no opportunity/pipeline is created here (that's the app's quote flow,
 * lib/app/ghl/sync-quote.ts, which has real pipeline/stage context to use).
 */
export class GhlLeadNotifier implements Notifier {
  async notifyNewLead(lead: Lead): Promise<void> {
    try {
      const client = getGhlClient();
      const { payload } = lead;

      const contact = await client.upsertContact({
        name: payload.name,
        phone: payload.phone,
        email: payload.email,
        address: payload.propertyAddress,
        tags: ["website-lead", payload.type, payload.intent],
      });

      if (!contact) {
        console.warn("[GhlLeadNotifier] contact upsert returned no id — GHL not configured or call failed.");
        return;
      }

      console.log(`[GhlLeadNotifier] Upserted GHL contact ${contact.contactId} for a ${payload.type} lead.`);
    } catch (error) {
      console.error("[GhlLeadNotifier] failed (best-effort, non-fatal)", error);
    }
  }
}

/**
 * Config-selected slot for the real channel. GHL is used once its Private
 * Integration Token + location id are set; otherwise falls back to the log
 * stub so the contact form works end-to-end with zero GHL credentials.
 */
export function getNotifier(): Notifier {
  if (process.env.GHL_PRIVATE_INTEGRATION_TOKEN && process.env.GHL_LOCATION_ID) {
    return new GhlLeadNotifier();
  }
  return new LogNotifier();
}
