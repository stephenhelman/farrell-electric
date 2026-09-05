export type LeadIntent = "landscape-lighting" | "permanent-lighting" | "electrical" | "commercial";

interface BaseLeadFields {
  intent: LeadIntent;
  name: string;
  phone: string;
  email: string;
  propertyAddress: string;
}

export interface LightingLeadPayload extends BaseLeadFields {
  type: "lighting";
  interestedIn: "landscape-lighting" | "permanent-lighting" | "both" | "not-sure";
  projectDetails: string;
}

export interface ElectricalLeadPayload extends BaseLeadFields {
  type: "electrical";
  issueType: string;
  description: string;
  preferredContactMethod: "phone" | "email" | "text";
}

export type LeadPayload = LightingLeadPayload | ElectricalLeadPayload;

export interface SubmitLeadResult {
  ok: boolean;
  /** Always written false at submit time — a real-transport backfill sweep flips it later. */
  notified: false;
  /** True when the Sheets write was skipped because credentials aren't configured yet. */
  stub: boolean;
}
