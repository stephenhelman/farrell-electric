import { dispatchGhlEvent } from "@/lib/ghl/dispatch";
import type { RepoJob, RepoPayment, RepoQuoteDetail } from "@/lib/app/repo/types";
import { balanceDue } from "@/lib/app/jobs/lifecycle";
import { buildPayLink, buildSowLink } from "@/lib/config";

/**
 * Fires job.contract_sent from STORED values (the persisted job + quote), never
 * transient form state. Best-effort, non-fatal — same discipline as
 * dispatchQuoteToGhl; the DB write already succeeded.
 *
 * The payload is hand-mapped field by field on purpose. RepoJob carries
 * revenue/actualCost, so it must never be spread into a GHL payload
 * (economics wall). Only the quote's customer-facing `total` crosses. The scope of
 * work and payment type are intentionally not sent (see JobContractSentPayload).
 */
export async function dispatchJobContractSent(job: RepoJob, quote: RepoQuoteDetail): Promise<void> {
  await dispatchGhlEvent({
    event: "job.contract_sent",
    jobId: job.id,
    quoteId: quote.id,
    quoteNumber: quote.number,
    ...(job.leadId && { leadId: job.leadId }),
    ghlContactId: quote.ghlContactId,
    // Read through the lead via the job; the quote row carries no opp id.
    ghlSalesOpportunityId: job.ghlSalesOpportunityId,
    ghlOpsOpportunityId: job.ghlOpsOpportunityId,
    depositRequired: job.depositRequired,
    depositAmount: job.depositAmount,
    balanceDue: Math.max(0, balanceDue(job)),
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
    ...(job.leadId && { leadId: job.leadId }),
    ghlContactId: job.ghlContactId,
    ghlSalesOpportunityId: job.ghlSalesOpportunityId,
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
    ...(job.leadId && { leadId: job.leadId }),
    ghlContactId: job.ghlContactId,
    ghlSalesOpportunityId: job.ghlSalesOpportunityId,
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
    ghlSalesOpportunityId: job.ghlSalesOpportunityId,
    ghlOpsOpportunityId: job.ghlOpsOpportunityId,
    amountPaid: payment.amount,
    method: payment.method,
    balanceRemaining: Math.max(0, balanceDue(job)),
    paidAt: payment.paidAt.toISOString(),
  };

  await dispatchGhlEvent(
    payment.kind === "DEPOSIT"
      ? { event: "job.deposit_paid", kind: "deposit", ...common }
      : { event: "job.balance_paid", kind: "balance", ...common },
  );
}

/**
 * job.created — hand-mapped from the stored job (RepoJob carries
 * revenue/actualCost, which never cross). Best-effort, non-fatal.
 */
export async function dispatchJobCreated(job: RepoJob): Promise<void> {
  await dispatchGhlEvent({
    event: "job.created",
    jobId: job.id,
    quoteId: job.quoteId,
    quoteNumber: job.quoteNumber,
    ...(job.leadId && { leadId: job.leadId }),
    ghlContactId: job.ghlContactId,
    ghlSalesOpportunityId: job.ghlSalesOpportunityId,
    ghlOpsOpportunityId: job.ghlOpsOpportunityId,
    total: job.total,
    customerName: job.customerName,
    // Branded short link, never the raw blob URL (Job.sowUrl stays internal).
    sowUrl: job.sowUrl && job.quotePublicToken ? buildSowLink(job.quotePublicToken) : null,
  });
}

/**
 * job.deposit_requested / job.balance_requested. Hand-mapped like the rest —
 * RepoJob carries revenue/actualCost. Needs a minted payToken (the caller,
 * requestPaymentIfOwed, ensures one). Best-effort, non-fatal.
 */
export async function dispatchJobPaymentRequested(
  job: RepoJob,
  kind: "deposit" | "balance",
  amountDue: number,
  payToken: string,
): Promise<void> {
  const common = {
    jobId: job.id,
    quoteId: job.quoteId,
    quoteNumber: job.quoteNumber,
    ...(job.leadId && { leadId: job.leadId }),
    ghlContactId: job.ghlContactId,
    ghlSalesOpportunityId: job.ghlSalesOpportunityId,
    ghlOpsOpportunityId: job.ghlOpsOpportunityId,
    amountDue,
    payUrl: buildPayLink(payToken),
  };

  await dispatchGhlEvent(
    kind === "deposit"
      ? { event: "job.deposit_requested", kind: "deposit", ...common }
      : { event: "job.balance_requested", kind: "balance", ...common },
  );
}
