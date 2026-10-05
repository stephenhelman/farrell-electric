import { dispatchGhlEvent } from "@/lib/ghl/dispatch";
import type { RepoJob, RepoQuoteDetail } from "@/lib/app/repo/types";

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
