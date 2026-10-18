import type { Repo } from "@/lib/app/repo/types";
import { dispatchJobPaymentRequested } from "@/lib/app/ghl/dispatch-job";
import { balanceOutstanding, depositOutstanding } from "@/lib/app/pay/context";

/**
 * Fires job.deposit_requested / job.balance_requested — but ONLY if that kind of
 * payment is actually still owed, judged from the stored job + ledger at this
 * moment. That is the suppression guard: a customer who paid by check/Zelle
 * before signing has depositPaid already, so signing sends no redundant deposit
 * request (the job just closes); an installed job with nothing owed sends no
 * balance request.
 *
 * Resolves true when a request was dispatched. Mints the pay token if the job
 * predates it. DB errors propagate to the caller; dispatch itself never throws.
 */
export async function requestPaymentIfOwed(repo: Repo, jobId: string, kind: "deposit" | "balance"): Promise<boolean> {
  const job = await repo.getJob(jobId);
  if (!job) return false;

  const amountDue =
    kind === "deposit" ? depositOutstanding(job, await repo.listPaymentsForJob(jobId)) : balanceOutstanding(job);
  if (amountDue === null) return false;

  const payToken = job.payToken ?? (await repo.ensurePayToken(jobId));
  if (!payToken) return false;

  await dispatchJobPaymentRequested(job, kind, amountDue, payToken);
  return true;
}
