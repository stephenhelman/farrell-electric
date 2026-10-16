import type { PaymentKind, PaymentType, Repo, RepoPayment } from "@/lib/app/repo/types";
import { dispatchJobPaymentReceived } from "@/lib/app/ghl/dispatch-job";
import { advanceJobLifecycle } from "./gates";
import { balanceDue } from "./lifecycle";

export interface ConfirmPaymentInput {
  jobId: string;
  kind: PaymentKind;
  method: PaymentType;
  /** Dollars received; must be > 0. */
  amount: number;
  /** Check number, Zelle memo, etc. */
  reference: string | null;
  /** Idempotency key — the same externalRef is only ever recorded once. */
  externalRef: string;
  /** Rep id for a manual entry; "quickbooks" for the webhook. */
  recordedBy: string | null;
  /** When the money arrived; defaults to now. */
  paidAt?: Date;
}

export type ConfirmPaymentResult =
  | { ok: true; recorded: boolean; payment: RepoPayment }
  | { ok: false; error: string };

/**
 * THE converged path for a received payment — the rep's mark-paid action and
 * the QuickBooks webhook both land here. In order:
 *   1. record the money in the ledger (idempotent on externalRef),
 *   2. set depositPaid (DEPOSIT) and finalInvoicePaid (balance now <= 0),
 *   3. run the lifecycle gates (job.closed / job.completed, each exactly-once),
 *   4. fire job.deposit_paid / job.balance_paid — only for the call that actually recorded the row.
 *
 * A repeat externalRef is not a failure and fires no payment event, but steps
 * 2–3 still run: they're idempotent, and it lets a redelivery finish the work
 * if an earlier attempt died after the ledger write. A failed dispatch is
 * logged by dispatchGhlEvent and never rolls anything back. DB errors propagate
 * so the caller (a webhook) can answer 500 and be redelivered.
 */
export async function confirmPayment(repo: Repo, input: ConfirmPaymentInput): Promise<ConfirmPaymentResult> {
  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    return { ok: false, error: "Enter a payment amount greater than zero." };
  }
  if (!input.externalRef.trim()) return { ok: false, error: "A payment needs an idempotency reference." };

  const before = await repo.getJob(input.jobId);
  if (!before) return { ok: false, error: "Job not found." };

  const { payment, created } = await repo.createPayment({
    jobId: input.jobId,
    kind: input.kind,
    method: input.method,
    amount: Math.round(input.amount * 100) / 100,
    paidAt: input.paidAt ?? new Date(),
    reference: input.reference,
    recordedBy: input.recordedBy,
    externalRef: input.externalRef,
  });

  // Flags are judged from the ledger, not the request, so any order/redelivery converges.
  const job = (await repo.getJob(input.jobId)) ?? before;
  const now = new Date();
  if (payment.kind === "DEPOSIT" && !job.depositPaid) {
    await repo.updateJob(job.id, { depositPaid: true, depositPaidAt: payment.paidAt });
  }
  if (balanceDue(job) <= 0 && !job.finalInvoicePaid) {
    await repo.updateJob(job.id, { finalInvoicePaid: true, finalInvoicePaidAt: now });
  }

  await advanceJobLifecycle(repo, job.id);

  if (created) {
    const settled = await repo.getJob(job.id);
    if (settled) await dispatchJobPaymentReceived(settled, payment);
  }

  return { ok: true, recorded: created, payment };
}
