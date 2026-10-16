import { dispatchGhlEvent } from "@/lib/ghl/dispatch";
import type { RepoJob, RepoPayment, RepoQuoteDetail } from "@/lib/app/repo/types";
import { balanceDue } from "@/lib/app/jobs/lifecycle";

/**
 * Fires job.contract_sent from STORED values (the persisted job + quote), never
 * transient form state. Best-effort, non-fatal — same discipline as
 * dispatchQuoteToGhl; the DB write already succeeded.
 *
 * The payload is hand-mapped field by field on purpose. RepoJob carries
 * revenue/actualCost, so it must never be spread into a GHL payload
 * (economics wall). Only the quote's customer-facing `total` crosses.
 */
export async function dispatchJobContractSent(
  job: RepoJob,
  quote: RepoQuoteDetail,
  scopeOfWork: string,
): Promise<void> {
  if (job.paymentType === null) return; // unreachable after sendJobContract; narrows the type.

  await dispatchGhlEvent({
    event: "job.contract_sent",
    jobId: job.id,
    quoteId: quote.id,
    quoteNumber: quote.number,
    ghlContactId: quote.ghlContactId,
    // Read through the lead via the job; the quote row carries no opp id.
    ghlOpsOpportunityId: job.ghlOpsOpportunityId,
    scopeOfWork,
    paymentType: job.paymentType,
    depositRequired: job.depositRequired,
    depositAmount: job.depositAmount,
    total: quote.total,
    customerName: quote.customerName,
    customerPhone: quote.customerPhone,
    customerEmail: quote.customerEmail,
    customerAddress: quote.customerAddress,
  });
}

/**
 * job.closed / job.completed. Fired by the lifecycle gates (lib/app/jobs/gates.ts)
 * only after they have WON the claimJob* guard, so each fires once per job.
 * Hand-mapped for the same reason as above — RepoJob carries revenue/actualCost.
 * Best-effort, non-fatal.
 */
export async function dispatchJobClosed(job: RepoJob): Promise<void> {
  if (!job.closedAt) return;

  await dispatchGhlEvent({
    event: "job.closed",
    jobId: job.id,
    quoteId: job.quoteId,
    quoteNumber: job.quoteNumber,
    ghlContactId: job.ghlContactId,
    ghlOpsOpportunityId: job.ghlOpsOpportunityId,
    total: job.total,
    closedAt: job.closedAt.toISOString(),
  });
}

export async function dispatchJobCompleted(job: RepoJob): Promise<void> {
  if (!job.completedAt || !job.installedDate) return;

  await dispatchGhlEvent({
    event: "job.completed",
    jobId: job.id,
    quoteId: job.quoteId,
    quoteNumber: job.quoteNumber,
    ghlContactId: job.ghlContactId,
    ghlOpsOpportunityId: job.ghlOpsOpportunityId,
    total: job.total,
    completedAt: job.completedAt.toISOString(),
    installedDate: job.installedDate.toISOString(),
  });
}

/**
 * job.deposit_paid / job.balance_paid, from the ledger row just recorded plus
 * the job as stored AFTER that payment (so balanceRemaining is current).
 * Hand-mapped — RepoJob carries revenue/actualCost, which never cross. Money on
 * the wire is this payment's amount and what remains; nothing else. Best-effort, non-fatal.
 */
export async function dispatchJobPaymentReceived(job: RepoJob, payment: RepoPayment): Promise<void> {
  const common = {
    jobId: job.id,
    quoteId: job.quoteId,
    quoteNumber: job.quoteNumber,
    ...(job.leadId && { leadId: job.leadId }),
    ghlContactId: job.ghlContactId,
    ghlOpsOpportunityId: job.ghlOpsOpportunityId,
    amountPaid: payment.amount,
    method: payment.method,
    balanceRemaining: Math.max(0, balanceDue(job)),
    paidAt: payment.paidAt.toISOString(),
  };

  await dispatchGhlEvent(
    payment.kind === "DEPOSIT"
      ? { event: "job.deposit_paid", kind: "DEPOSIT", ...common }
      : { event: "job.balance_paid", kind: "BALANCE", ...common },
  );
}
