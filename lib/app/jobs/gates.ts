import type { Repo } from "@/lib/app/repo/types";
import { dispatchJobClosed, dispatchJobCompleted } from "@/lib/app/ghl/dispatch-job";
import { closeGateMet, completeGateMet } from "./lifecycle";

export interface AdvanceResult {
  closed: boolean;
  completed: boolean;
}

/**
 * The server-side AND-gates. Call AFTER a Job field write; it re-reads the job
 * so it judges the stored flags, never transient input — which is what lets
 * the two conditions arrive in any order.
 *
 *   Closed   = contractSigned && (depositPaid || !depositRequired)  -> job.closed
 *   Complete = Closed && installed && (finalInvoicePaid || balanceDue <= 0) -> job.completed
 *
 * Close is evaluated before Complete, and Complete requires Closed, so the
 * event that finally satisfies both fires job.closed then job.completed in one pass.
 *
 * Exactly-once: a gate fires only if its predicate holds AND this call wins the
 * claimJob* conditional update (`WHERE closedAt/completedAt IS NULL`). A
 * re-delivery, a concurrent delivery, or a later unrelated event re-checks
 * harmlessly and loses the claim.
 *
 * The claim is taken before the dispatch, so a failed dispatch (logged,
 * non-fatal, never rolls back the DB) is not retried by the server. DB errors
 * DO propagate, so the caller can surface a failure and let GHL redeliver.
 */
export async function advanceJobLifecycle(repo: Repo, jobId: string): Promise<AdvanceResult> {
  const result: AdvanceResult = { closed: false, completed: false };

  const job = await repo.getJob(jobId);
  if (!job) return result;

  if (job.closedAt === null && closeGateMet(job) && (await repo.claimJobClosed(jobId))) {
    result.closed = true;
    const claimed = await repo.getJob(jobId);
    if (claimed) await dispatchJobClosed(claimed);
  }

  if (job.completedAt === null && completeGateMet(job) && (await repo.claimJobCompleted(jobId))) {
    result.completed = true;
    const claimed = await repo.getJob(jobId);
    if (claimed) await dispatchJobCompleted(claimed);
  }

  return result;
}
