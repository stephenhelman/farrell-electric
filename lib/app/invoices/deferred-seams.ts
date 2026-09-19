/**
 * Task 10 builds the invoice artifact only — the public
 * app/(public)/q/[token]/invoice route. Payment and delivery are explicitly
 * DEFERRED per the sprint's ownership split (Stripe/GHL are separate future
 * tasks) and are NOT wired to any UI trigger. These two functions exist so
 * the seam is discoverable in code, not so it's usable — both intentionally
 * throw if ever called.
 */

export interface ChargeInvoiceInput {
  quoteId: string;
  amountDue: number;
}

export interface ChargeInvoiceResult {
  paid: boolean;
  stripePaymentIntentId: string;
}

/** TODO(owner/future task): wire to Stripe. Not implemented — no Stripe client exists yet. */
export async function chargeInvoiceViaStripe(input: ChargeInvoiceInput): Promise<ChargeInvoiceResult> {
  void input;
  throw new Error(
    "chargeInvoiceViaStripe is not implemented — online payment is a deferred seam (Task 10 notes). " +
      "Collect payment outside the app for now.",
  );
}

export interface DeliverInvoiceInput {
  quoteId: string;
  invoiceUrl: string;
}

/**
 * TODO(owner/future task): wire to GHL — dispatch an invoice-ready event the
 * same way lib/app/ghl/dispatch-quote.ts fires quote.sent/quote.accepted,
 * once this seam is picked up. Not implemented — share the invoice link
 * manually until then.
 */
export async function deliverInvoiceViaGhl(input: DeliverInvoiceInput): Promise<void> {
  void input;
  throw new Error(
    "deliverInvoiceViaGhl is not implemented — automatic invoice delivery is a deferred seam (Task 10 notes). " +
      "Share the invoice link manually for now.",
  );
}
