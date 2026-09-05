import type { LeadPayload } from "@/lib/leads/types";

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
 * Config-selected slot for the real channel (OP email system or otherwise).
 * Swap the returned implementation here when that transport is ready.
 */
export function getNotifier(): Notifier {
  return new LogNotifier();
}
