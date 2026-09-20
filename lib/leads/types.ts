export type LeadIntent = "landscape-lighting" | "permanent-lighting" | "electrical" | "commercial";

interface BaseLeadFields {
  intent: LeadIntent;
  name: string;
  phone: string;
  email: string;
  propertyAddress: string;
  preferredContactMethod: "phone" | "email" | "text";
  /** SMS opt-in for informational/transactional messages — false unless the checkbox was actively checked. */
  smsConsentTransactional: boolean;
  /** SMS opt-in for promotional messages — false unless the checkbox was actively checked. */
  smsConsentPromotional: boolean;
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
}

export type LeadPayload = LightingLeadPayload | ElectricalLeadPayload;

export interface SubmitLeadResult {
  ok: boolean;
  /** Always written false at submit time — a real-transport backfill sweep flips it later. */
  notified: false;
  /** True when the Sheets write was skipped because credentials aren't configured yet. */
  stub: boolean;
}
