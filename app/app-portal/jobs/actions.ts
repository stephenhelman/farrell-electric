"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { getRepo } from "@/lib/app/repo";
import { requireRepSession } from "@/lib/app/auth/require-session";
import { confirmPayment } from "@/lib/app/jobs/payments";
import { requestCurrentPayment } from "@/lib/app/jobs/requests";
import { validateMarkPaid, type MarkPaidInput } from "@/lib/app/jobs/manual-payment";
import { advanceJobLifecycle } from "@/lib/app/jobs/gates";
import { dispatchJobContractSent } from "@/lib/app/ghl/dispatch-job";
import {
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
  await requireRepSession();
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
    await dispatchJobContractSent(updated, quote);
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
  await requireRepSession();
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

/**
 * Rep-recorded payment for money settled outside the app (check / Zelle / cash
 * / financing / other). Goes through the same confirmPayment as the QuickBooks
 * webhook, so the ledger, depositPaid/finalInvoicePaid, the lifecycle gates and
 * the GHL event all behave identically. CARD is rejected here (see
 * MANUAL_PAYMENT_METHODS) — card money comes only from the QuickBooks webhook.
 *
 * externalRef is "manual:<key>"; the modal supplies one key per open dialog so
 * a double-click or retried request records once, otherwise a fresh uuid.
 */
export async function markPaidAction(jobId: string, input: MarkPaidInput): Promise<JobActionResult> {
  const { userId } = await requireRepSession();

  const validated = validateMarkPaid(input);
  if (!validated.ok) return validated;

  const repo = await getRepo();
  const result = await confirmPayment(repo, {
    jobId,
    kind: validated.kind,
    method: validated.method,
    amount: validated.amount,
    reference: validated.reference,
    paidAt: validated.paidAt,
    recordedBy: userId,
    externalRef: `manual:${validated.idempotencyKey ?? randomUUID()}`,
  });
  if (!result.ok) return result;

  revalidatePath(`/app-portal/jobs/${jobId}`);
  revalidatePath("/app-portal/jobs");
  return { ok: true };
}

export type SendPaymentRequestResult =
  | { ok: true; sent: true; kind: "deposit" | "balance"; amount: number }
  | { ok: true; sent: false; reason: "nothing due" }
  | { ok: false; error: string };

/**
 * Rep recovery / proactive resend of the customer's pay link. Same path as the
 * auto-triggers (requestPaymentIfOwed), so the guard and payload are identical:
 * fires job.deposit_requested or job.balance_requested for whatever is owed
 * right now, minting the pay token first if needed. Nothing owed sends nothing.
 */
export async function sendPaymentRequestAction(jobId: string): Promise<SendPaymentRequestResult> {
  await requireRepSession();

  const repo = await getRepo();
  if (!(await repo.getJob(jobId))) return { ok: false, error: "Job not found." };

  const sent = await requestCurrentPayment(repo, jobId);
  if (!sent) return { ok: true, sent: false, reason: "nothing due" };

  revalidatePath(`/app-portal/jobs/${jobId}`);
  return { ok: true, sent: true, kind: sent.kind, amount: sent.amountDue };
}
