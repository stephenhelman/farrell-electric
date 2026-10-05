"use server";

import { getRepo } from "@/lib/app/repo";
import { advanceJobLifecycle } from "@/lib/app/jobs/gates";
import { dispatchJobContractSent } from "@/lib/app/ghl/dispatch-job";
import {
  resolveScopeOfWork,
  validateContractInput,
  type GenerateContractInput,
} from "@/lib/app/jobs/contract";

export type JobActionResult = { ok: true } | { ok: false; error: string };

/**
 * Rep-driven contract generation. Order matters:
 *   1. refuse early if SIGNED (the button is locked, but the server is the guard),
 *   2. write client-info edits back to the Quote (one source),
 *   3. persist terms + SENT through the conditional repo write — which itself
 *      refuses a SIGNED job, so a signature landing mid-flight is never downgraded,
 *   4. fire job.contract_sent from the STORED job + quote (non-fatal).
 */
export async function generateContractAction(
  jobId: string,
  input: GenerateContractInput,
): Promise<JobActionResult> {
  const repo = await getRepo();

  const job = await repo.getJob(jobId);
  if (!job) return { ok: false, error: "Job not found." };
  if (job.contractStatus === "SIGNED") {
    return { ok: false, error: "This contract is already signed and can't be regenerated." };
  }

  const validated = validateContractInput(input, job.revenue);
  if (!validated.ok) return validated;

  await repo.updateQuoteCustomer(job.quoteId, validated.customer);

  const updated = await repo.sendJobContract(jobId, validated.terms);
  if (!updated) {
    return { ok: false, error: "This contract was just signed and can't be regenerated." };
  }

  const quote = await repo.getQuote(job.quoteId);
  if (quote) {
    await dispatchJobContractSent(updated, quote, resolveScopeOfWork(quote));
  }

  // New terms can change the balance due. If the job was already installed, no
  // later inbound event would re-check the Complete gate — so check it here.
  try {
    await advanceJobLifecycle(repo, jobId);
  } catch (error) {
    console.error("[jobs/actions] lifecycle check after contract failed (non-fatal)", error);
  }

  return { ok: true };
}

/** Internal financials entry. null/empty clears it. Rep-only; never leaves the app. */
export async function updateActualCostAction(
  jobId: string,
  actualCost: number | null,
): Promise<JobActionResult> {
  if (actualCost !== null && (!Number.isFinite(actualCost) || actualCost < 0)) {
    return { ok: false, error: "Enter a cost of zero or more." };
  }

  const repo = await getRepo();
  const job = await repo.updateJob(jobId, {
    actualCost: actualCost === null ? null : Math.round(actualCost * 100) / 100,
  });
  if (!job) return { ok: false, error: "Job not found." };
  return { ok: true };
}
