import type { LeadPayload, SubmitLeadResult } from "./types";

/**
 * The single outbound seam for lead data. Swapping to Notion / GHL / a real
 * CRM later means reimplementing this one function — callers never change.
 *
 * v1 writes to a Google Sheet via a service account. If GOOGLE_SERVICE_ACCOUNT_JSON
 * or LEADS_SHEET_ID aren't set yet, the write is skipped and the lead is logged
 * server-side instead — the whole contact flow works end-to-end before those
 * credentials exist. Flipping to the real Sheet later is just setting the two
 * env vars; no caller or route-handler code changes.
 */
export async function submitLead(payload: LeadPayload): Promise<SubmitLeadResult> {
  const sheetId = process.env.LEADS_SHEET_ID;
  const credentialsJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;

  if (!sheetId || !credentialsJson) {
    console.log("[submitLead:stub] Sheets not configured — logging lead instead of writing.", payload);
    return { ok: true, notified: false, stub: true };
  }

  const { google } = await import("googleapis");
  const credentials = JSON.parse(credentialsJson);
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  const sheets = google.sheets({ version: "v4", auth });

  const tab = payload.type === "lighting" ? "Lighting Leads" : "Electrical Leads";
  const row = toRow(payload);

  await sheets.spreadsheets.values.append({
    spreadsheetId: sheetId,
    range: `${tab}!A1`,
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values: [row] },
  });

  return { ok: true, notified: false, stub: false };
}

function toRow(payload: LeadPayload): (string | boolean)[] {
  const submittedAt = new Date().toISOString();
  const notified = false;

  if (payload.type === "lighting") {
    return [
      submittedAt,
      payload.intent,
      payload.name,
      payload.phone,
      payload.email,
      payload.propertyAddress,
      payload.interestedIn,
      payload.projectDetails,
      payload.smsConsentTransactional,
      payload.smsConsentPromotional,
      notified,
    ];
  }

  return [
    submittedAt,
    payload.intent,
    payload.name,
    payload.phone,
    payload.email,
    payload.propertyAddress,
    payload.issueType,
    payload.description,
    payload.preferredContactMethod,
    payload.smsConsentTransactional,
    payload.smsConsentPromotional,
    notified,
  ];
}
