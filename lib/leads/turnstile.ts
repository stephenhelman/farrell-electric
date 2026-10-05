/**
 * Cloudflare Turnstile, OFF by default. Enforced only when BOTH keys are set:
 * TURNSTILE_SECRET_KEY (server) and NEXT_PUBLIC_TURNSTILE_SITE_KEY (widget).
 * With either unset, neither the widget nor this check exists — stub-first.
 *
 * One key without the other stays OFF (with a warning): the server would
 * otherwise demand a token the form never sends and wall out every human.
 */
const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const VERIFY_TIMEOUT_MS = 5000;

let warned = false;

export function isTurnstileEnabled(): boolean {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  if (Boolean(secret) !== Boolean(siteKey) && !warned) {
    warned = true;
    console.warn(
      "[turnstile] only one of TURNSTILE_SECRET_KEY / NEXT_PUBLIC_TURNSTILE_SITE_KEY is set — Turnstile stays OFF until both are.",
    );
  }
  return Boolean(secret && siteKey);
}

export type TurnstileResult = "passed" | "failed" | "unavailable";

/**
 * "failed" = a missing/invalid token (reject). "unavailable" = Cloudflare
 * unreachable or errored — fail OPEN: an outage on their side must not wall
 * out real customers.
 */
export async function verifyTurnstile(token: unknown): Promise<TurnstileResult> {
  if (typeof token !== "string" || token.trim() === "") return "failed";

  try {
    const response = await fetch(VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret: process.env.TURNSTILE_SECRET_KEY ?? "", response: token }),
      signal: AbortSignal.timeout(VERIFY_TIMEOUT_MS),
    });
    if (!response.ok) {
      console.error("[turnstile] verify endpoint returned", response.status, "— failing open");
      return "unavailable";
    }
    const result = (await response.json()) as { success?: boolean };
    return result.success === true ? "passed" : "failed";
  } catch (error) {
    console.error("[turnstile] verify threw — failing open", error);
    return "unavailable";
  }
}
