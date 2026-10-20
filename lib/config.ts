/**
 * The main marketing domain — same default the marketing root layout uses
 * for metadataBase. Customer-facing links (the Task 8 quote-link route,
 * GHL message delivery) resolve against this, not the app host: a customer
 * should never see app.farrellelectric.com.
 */
export function getSiteBaseUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.farrellelectric.com";
}

export function buildPayLink(payToken: string): string {
  return `${getSiteBaseUrl()}/pay/${payToken}`;
}

/** Branded short link to the Scope-of-Work PDF; /sow/[token] 302s to the internal blob URL. */
export function buildSowLink(publicToken: string): string {
  return `${getSiteBaseUrl()}/sow/${publicToken}`;
}

export function buildQuoteLink(publicToken: string): string {
  return `${getSiteBaseUrl()}/q/${publicToken}`;
}
