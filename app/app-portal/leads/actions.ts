"use server";

import { getRepo } from "@/lib/app/repo";
import type { LeadType } from "@/lib/app/repo/types";
import type { LeadPayload } from "@/lib/leads/types";
import { EMAIL_PATTERN, LEAD_FIELD_LIMITS, PHONE_MAX_DIGITS, PHONE_MIN_DIGITS } from "@/lib/leads/validation";
import { getNotifier } from "@/lib/notifications/notifier";

export interface CreatePortalLeadInput {
  leadType: LeadType;
  name: string;
  phone: string;
  email: string;
  propertyAddress: string;
}

export type CreatePortalLeadResult = { ok: true; leadId: string } | { ok: false; error: string };

/**
 * Barebones lead created by a rep from the quote screen. Same source of truth
 * (createLead) and same lead.created signal as the website form, so GHL mints
 * the contact + Sales opp and echoes the ids back. Deliberately NOT behind the
 * public form's honeypot/timing/Turnstile — this is an authenticated portal
 * action, and those checks exist for anonymous traffic.
 *
 * SMS consent is always false: a rep typing in a lead is not the customer's
 * provable opt-in, and the GHL workflow must not text off it.
 */
export async function createPortalLeadAction(input: CreatePortalLeadInput): Promise<CreatePortalLeadResult> {
  const name = input.name.trim();
  const phone = input.phone.trim();
  const email = input.email.trim();
  const propertyAddress = input.propertyAddress.trim();

  if (input.leadType !== "LIGHTING" && input.leadType !== "ELECTRICAL") {
    return { ok: false, error: "Choose lighting or electrical." };
  }
  if (!name) return { ok: false, error: "Add a name." };
  if (name.length > LEAD_FIELD_LIMITS.name) return { ok: false, error: "That name is too long." };
  const digits = phone.replace(/\D/g, "").length;
  if (phone.length > LEAD_FIELD_LIMITS.phone || digits < PHONE_MIN_DIGITS || digits > PHONE_MAX_DIGITS) {
    return { ok: false, error: "Enter a valid phone number, including area code." };
  }
  if (email && (email.length > LEAD_FIELD_LIMITS.email || !EMAIL_PATTERN.test(email))) {
    return { ok: false, error: "Enter a valid email address, or leave it blank." };
  }
  if (propertyAddress.length > LEAD_FIELD_LIMITS.propertyAddress) {
    return { ok: false, error: "That address is too long." };
  }

  const type = input.leadType === "LIGHTING" ? "lighting" : "electrical";
  const base = {
    name,
    phone,
    email,
    propertyAddress,
    preferredContactMethod: "phone" as const,
    smsConsentTransactional: false,
    smsConsentPromotional: false,
  };
  const payload: LeadPayload =
    type === "lighting"
      ? { ...base, type, intent: "landscape-lighting", interestedIn: "not-sure", projectDetails: "" }
      : { ...base, type, intent: "electrical", issueType: "", description: "" };

  const repo = await getRepo();
  let leadId: string;
  try {
    const lead = await repo.createLead({
      source: "portal",
      leadType: input.leadType,
      name,
      phone,
      email: email || null,
      propertyAddress: propertyAddress || null,
      details: payload,
      smsConsentTransactional: false,
      smsConsentPromotional: false,
    });
    leadId = lead.id;
  } catch (error) {
    console.error("[leads/actions] createPortalLead failed", error);
    return { ok: false, error: "Couldn't save the lead. Try again." };
  }

  // Best-effort, non-fatal — the lead exists either way; a failed signal just
  // means no contact id ever arrives (the quote screen's sync UI surfaces that).
  try {
    await getNotifier().notifyNewLead({
      leadId,
      source: "portal",
      payload,
      submittedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[leads/actions] notifyNewLead failed", error);
  }

  return { ok: true, leadId };
}

/** Polled by the quote screen — reads only the contact id the GHL echo-back writes onto the lead. */
export async function getLeadSyncAction(leadId: string): Promise<{ ghlContactId: string | null }> {
  const repo = await getRepo();
  const lead = await repo.getLeadById(leadId);
  return { ghlContactId: lead?.ghlContactId ?? null };
}
