/** GHL install-scheduling calendar (booking widget embed). */

export const GHL_CALENDAR_ID = "NT66xQP2LGEiCvXBzF15";
export const GHL_CALENDAR_URL = `https://api.leadconnectorhq.com/widget/booking/${GHL_CALENDAR_ID}`;
/** GHL's embed helper (auto-resizes the iframe). */
export const GHL_EMBED_SCRIPT_SRC = "https://link.msgsndr.com/js/form_embed.js";

/**
 * Prefill field -> query-param name on the booking URL. The widget is a
 * cross-origin iframe, so we can't set its inputs from our DOM; GHL reads
 * these params instead. job_id must match the calendar's custom-field key.
 */
export const PREFILL_PARAMS = {
  jobId: "job_id",
  firstName: "first_name",
  lastName: "last_name",
  phone: "phone",
  email: "email",
} as const;

export type PrefillKey = keyof typeof PREFILL_PARAMS;

/** After "Done", re-fetch the job at these delays so installScheduledDate shows without a reload. */
export const REFRESH_DELAYS_MS = [3000, 8000];
