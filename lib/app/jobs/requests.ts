import type { Repo } from "@/lib/app/repo/types";
import { dispatchJobPaymentRequested } from "@/lib/app/ghl/dispatch-job";
import { amountDueNow, balanceOutstanding, depositOutstanding } from "@/lib/app/pay/context";

export interface SentPaymentRequest {
  kind: "deposit" | "balance";
  amountDue: number;
}

/**
 * Fires job.deposit_requested / job.balance_requested — but ONLY if that kind of
 * payment is actually still owed, judged from the stored job + ledger at this
 * moment. That is the suppression guard: a customer who paid by check/Zelle
 * before signing has depositPaid already, so signing sends no redundant deposit
 * request (the job just closes); an installed job with nothing owed sends no
 * balance request.
 *
 * Send-once per owed state: the matching Job.depositRequestedAt / balanceRequestedAt
 * is claimed atomically (WHERE ... IS NULL) before dispatching, so a redelivered
 * trigger finds it set and sends nothing — and, because the auto-triggers call this
 * on EVERY delivery, a redelivery after a mid-handler failure still sends the
 * request that the first attempt never reached. `force` (the rep's manual resend)
 * skips the claim, sends regardless, and re-stamps the marker.
 *
 * Resolves what was sent ({ kind, amountDue }), or null when nothing was owed or it
 * was already sent (nothing dispatched). Mints the pay token if the job predates it. DB errors
 * propagate to the caller; dispatch itself never throws.
 *
 * The auto-triggers (inbound contract_signed / installed) and the rep's manual
 * "Send payment request" both go through here, so the guard and payload are identical.
 */
export async function requestPaymentIfOwed(
  repo: Repo,
  jobId: string,
  kind: "deposit" | "balance",
  options: { force?: boolean } = {},
): Promise<SentPaymentRequest | null> {
  const job = await repo.getJob(jobId);
  if (!job) return null;

  const amountDue =
    kind === "deposit" ? depositOutstanding(job, await repo.listPaymentsForJob(jobId)) : balanceOutstanding(job);
  if (amountDue === null) return null;

  const payToken = job.payToken ?? (await repo.ensurePayToken(jobId));
  if (!payToken) return null;

  if (options.force) {
    await repo.updateJob(jobId, kind === "deposit" ? { depositRequestedAt: new Date() } : { balanceRequestedAt: new Date() });
  } else if (!(await repo.claimPaymentRequest(jobId, kind))) {
    return null;
  }

  await dispatchJobPaymentRequested(job, kind, amountDue, payToken);
  return { kind, amountDue };
}

/**
 * The rep's manual (re)send: requests whatever is owed RIGHT NOW — the deposit
 * remainder first, else the balance, the same order the /pay page presents — via
 * the shared requestPaymentIfOwed. Null when nothing is due.
 */
export async function requestCurrentPayment(repo: Repo, jobId: string): Promise<SentPaymentRequest | null> {
  const job = await repo.getJob(jobId);
  if (!job) return null;
  const due = amountDueNow(job, await repo.listPaymentsForJob(jobId));
  return due ? requestPaymentIfOwed(repo, jobId, due.kind, { force: true }) : null;
}
