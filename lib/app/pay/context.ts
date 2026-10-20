import type { PublicPayContext, RepoJob, RepoPayment } from "@/lib/app/repo/types";
import { balanceDue } from "@/lib/app/jobs/lifecycle";
import { buildSowLink } from "@/lib/config";

const toCents = (amount: number) => Math.round(amount * 100);

/** Deposit still owed: required, not yet satisfied. Returns the remaining dollars, or null. */
export function depositOutstanding(
  job: Pick<RepoJob, "depositRequired" | "depositAmount" | "depositPaid">,
  payments: Pick<RepoPayment, "kind" | "amount">[],
): number | null {
  if (!job.depositRequired || job.depositPaid) return null;
  const received = payments.filter((p) => p.kind === "DEPOSIT").reduce((sum, p) => sum + toCents(p.amount), 0);
  const remaining = (toCents(job.depositAmount ?? 0) - received) / 100;
  return remaining > 0 ? remaining : null;
}

/** Balance still owed: money left after everything received, until the final invoice is settled. */
export function balanceOutstanding(
  job: Pick<RepoJob, "revenue" | "amountPaid" | "finalInvoicePaid">,
): number | null {
  if (job.finalInvoicePaid) return null;
  const due = balanceDue(job);
  return due > 0 ? due : null;
}

/** Deposit first, then balance, else nothing. */
export function amountDueNow(
  job: Pick<RepoJob, "depositRequired" | "depositAmount" | "depositPaid" | "revenue" | "amountPaid" | "finalInvoicePaid">,
  payments: Pick<RepoPayment, "kind" | "amount">[],
): PublicPayContext["due"] {
  const deposit = depositOutstanding(job, payments);
  if (deposit !== null) return { kind: "deposit", amount: deposit };
  const balance = balanceOutstanding(job);
  return balance !== null ? { kind: "balance", amount: balance } : null;
}

/**
 * RepoJob + its payments -> the public pay view. Hand-mapped: RepoJob carries
 * revenue/actualCost, and a payment row carries reference/recordedBy — none of
 * which cross. Shared by both repo impls.
 */
export function buildPayContext(job: RepoJob, payments: RepoPayment[]): PublicPayContext {
  return {
    customerName: job.customerName,
    referenceNumber: String(job.quoteNumber),
    sowUrl: job.sowUrl && job.quotePublicToken ? buildSowLink(job.quotePublicToken) : null,
    due: amountDueNow(job, payments),
    payments: payments.map((p) => ({ method: p.method, amount: p.amount, paidAt: p.paidAt })),
  };
}
