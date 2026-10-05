import { generateScopeOfWork } from "@/lib/app/quotes/scope-of-work";
import type { JobDealTermsInput, PaymentType, QuoteCustomerInput, RepoQuoteDetail } from "@/lib/app/repo/types";

export const PAYMENT_TYPES: readonly PaymentType[] = ["CARD", "CHECK", "CASH", "FINANCING", "OTHER"];

/** What the Generate Contract modal submits. Untrusted — the server re-validates everything. */
export interface GenerateContractInput {
  paymentType: string;
  depositRequired: boolean;
  /** Dollars; ignored unless depositRequired. */
  depositAmount: number | null;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  customerAddress: string;
}

export type ValidatedContractInput =
  | { ok: true; terms: JobDealTermsInput; customer: QuoteCustomerInput }
  | { ok: false; error: string };

/** `revenue` caps the deposit — a deposit larger than the job makes no sense. */
export function validateContractInput(input: GenerateContractInput, revenue: number): ValidatedContractInput {
  if (!PAYMENT_TYPES.includes(input.paymentType as PaymentType)) {
    return { ok: false, error: "Choose a payment type." };
  }

  let depositAmount: number | null = null;
  if (input.depositRequired) {
    const amount = input.depositAmount;
    if (amount === null || !Number.isFinite(amount) || amount <= 0) {
      return { ok: false, error: "Enter a deposit amount greater than zero." };
    }
    if (amount > revenue) {
      return { ok: false, error: "The deposit can't be more than the job total." };
    }
    depositAmount = Math.round(amount * 100) / 100;
  }

  const customer: QuoteCustomerInput = {
    customerName: input.customerName.trim(),
    customerPhone: input.customerPhone.trim(),
    customerEmail: input.customerEmail.trim(),
    customerAddress: input.customerAddress.trim(),
  };
  if (!customer.customerName) return { ok: false, error: "Client name is required." };
  if (!customer.customerAddress) return { ok: false, error: "Client address is required." };
  if (!customer.customerPhone && !customer.customerEmail) {
    return { ok: false, error: "Add a phone number or email so the contract can be delivered." };
  }

  return {
    ok: true,
    terms: { paymentType: input.paymentType as PaymentType, depositRequired: input.depositRequired, depositAmount },
    customer,
  };
}

/**
 * The contract's scope of work. The quote's stored SOW wins (it may carry the
 * owner's edits and is never overwritten here); only when it's empty do we
 * fall back to generating one from the line items.
 */
export function resolveScopeOfWork(quote: Pick<RepoQuoteDetail, "scopeOfWork" | "lineItems">): string {
  const stored = quote.scopeOfWork.trim();
  return stored || generateScopeOfWork(quote.lineItems);
}
