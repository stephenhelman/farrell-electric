import type {
  GhlContactInput,
  GhlContactResult,
  GhlMessageInput,
  GhlOpportunityInput,
  GhlOpportunityResult,
} from "./types";

/**
 * The single outbound seam for GoHighLevel — shared by the marketing site's
 * lead-notification path (lib/notifications/notifier.ts) and the app's quote
 * flow (lib/app/ghl/sync-quote.ts). Same no-op-when-unconfigured philosophy
 * as lib/notifications/notifier.ts's LogNotifier: with no Private Integration
 * Token, every call logs and returns null/false instead of throwing, so the
 * whole app builds and runs with zero GHL credentials.
 */
export interface GhlClient {
  upsertContact(input: GhlContactInput): Promise<GhlContactResult | null>;
  upsertOpportunity(input: GhlOpportunityInput): Promise<GhlOpportunityResult | null>;
  sendMessage(input: GhlMessageInput): Promise<boolean>;
}

class NoopGhlClient implements GhlClient {
  async upsertContact(input: GhlContactInput): Promise<GhlContactResult | null> {
    console.log("[GHL:noop] upsertContact — GHL_PRIVATE_INTEGRATION_TOKEN/GHL_LOCATION_ID not set.", input);
    return null;
  }

  async upsertOpportunity(input: GhlOpportunityInput): Promise<GhlOpportunityResult | null> {
    console.log("[GHL:noop] upsertOpportunity — GHL_PRIVATE_INTEGRATION_TOKEN/GHL_LOCATION_ID not set.", input);
    return null;
  }

  async sendMessage(input: GhlMessageInput): Promise<boolean> {
    console.log("[GHL:noop] sendMessage — GHL_PRIVATE_INTEGRATION_TOKEN/GHL_LOCATION_ID not set.", input);
    return false;
  }
}

const GHL_API_BASE = "https://services.leadconnectorhq.com";
const GHL_API_VERSION = "2021-07-28";

class LiveGhlClient implements GhlClient {
  constructor(
    private readonly token: string,
    private readonly locationId: string,
  ) {}

  private async request(path: string, init: RequestInit): Promise<Response> {
    return fetch(`${GHL_API_BASE}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${this.token}`,
        Version: GHL_API_VERSION,
        "Content-Type": "application/json",
        ...init.headers,
      },
    });
  }

  async upsertContact(input: GhlContactInput): Promise<GhlContactResult | null> {
    try {
      const response = await this.request("/contacts/upsert", {
        method: "POST",
        body: JSON.stringify({
          locationId: this.locationId,
          name: input.name || undefined,
          phone: input.phone || undefined,
          email: input.email || undefined,
          address1: input.address || undefined,
          tags: input.tags,
        }),
      });

      if (!response.ok) {
        console.error("[GHL] upsertContact failed", response.status, await response.text());
        return null;
      }

      const data = await response.json();
      const contactId = data?.contact?.id ?? data?.id;
      return contactId ? { contactId } : null;
    } catch (error) {
      console.error("[GHL] upsertContact threw", error);
      return null;
    }
  }

  async upsertOpportunity(input: GhlOpportunityInput): Promise<GhlOpportunityResult | null> {
    // TODO(owner): GHL_PIPELINE_ID and per-stage pipeline-stage IDs are the
    // owner's to provide from their GHL account — not invented here. Without
    // them, opportunity sync is skipped (contact sync still runs).
    const pipelineId = process.env.GHL_PIPELINE_ID;
    const stageId = input.stage === "SENT" ? process.env.GHL_STAGE_SENT_ID : process.env.GHL_STAGE_ACCEPTED_ID;

    if (!pipelineId || !stageId) {
      console.warn(
        "[GHL] GHL_PIPELINE_ID / GHL_STAGE_SENT_ID / GHL_STAGE_ACCEPTED_ID not set — skipping opportunity sync. TODO(owner): provide these from the GHL pipeline setup.",
      );
      return null;
    }

    try {
      const path = input.existingOpportunityId
        ? `/opportunities/${input.existingOpportunityId}`
        : "/opportunities/";
      const method = input.existingOpportunityId ? "PUT" : "POST";

      const response = await this.request(path, {
        method,
        body: JSON.stringify({
          pipelineId,
          pipelineStageId: stageId,
          locationId: this.locationId,
          contactId: input.contactId,
          name: `Quote #${input.quoteNumber}`,
          monetaryValue: input.quoteTotal,
          status: "open",
        }),
      });

      if (!response.ok) {
        console.error("[GHL] upsertOpportunity failed", response.status, await response.text());
        return null;
      }

      const data = await response.json();
      const opportunityId = data?.opportunity?.id ?? data?.id ?? input.existingOpportunityId ?? null;
      return opportunityId ? { opportunityId } : null;
    } catch (error) {
      console.error("[GHL] upsertOpportunity threw", error);
      return null;
    }
  }

  async sendMessage(input: GhlMessageInput): Promise<boolean> {
    try {
      const response = await this.request("/conversations/messages", {
        method: "POST",
        body: JSON.stringify({
          type: input.channel,
          contactId: input.contactId,
          subject: input.subject,
          message: input.message,
        }),
      });

      if (!response.ok) {
        console.error("[GHL] sendMessage failed", input.channel, response.status, await response.text());
        return false;
      }
      return true;
    } catch (error) {
      console.error("[GHL] sendMessage threw", input.channel, error);
      return false;
    }
  }
}

export function getGhlClient(): GhlClient {
  const token = process.env.GHL_PRIVATE_INTEGRATION_TOKEN;
  const locationId = process.env.GHL_LOCATION_ID;

  if (!token || !locationId) {
    return new NoopGhlClient();
  }

  return new LiveGhlClient(token, locationId);
}
