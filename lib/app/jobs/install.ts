import type { Repo } from "@/lib/app/repo/types";
import { advanceJobLifecycle, type AdvanceResult } from "./gates";
import { requestPaymentIfOwed, type SentPaymentRequest } from "./requests";

export interface MarkInstalledResult {
  /** True only for the call that stamped installedDate; a repeat is a no-op (false). */
  claimed: boolean;
  /** False when refused because the job isn't closed (nothing written, nothing sent). */
  closed: boolean;
  advanced: AdvanceResult;
  /** The balance request sent by this call, or null (refused / already sent / nothing owed). */
  balanceRequest: SentPaymentRequest | null;
}

/**
 * THE install-completion path — shared by the inbound GHL `installed` echo and
 * the rep's in-app "Mark Installed". Requires a CLOSED job (contract signed and
 * deposit settled): a stray `installed` on an unclosed/unsigned job is a logged
 * no-op that stamps nothing and requests no balance.
 *
 * Claim-style: installedDate is stamped atomically only if still null. The
 * lifecycle gates always run afterwards (exactly-once via their own claims). The
 * balance request is attempted whenever the job is installed — including on a
 * redelivery — and is itself send-once (balanceRequestedAt), so a delivery that
 * died before requesting still gets it on retry without ever doubling. A
 * balance-request failure is non-fatal: the fact is written.
 */
export async function markJobInstalled(repo: Repo, jobId: string, installedDate: Date): Promise<MarkInstalledResult> {
  const job = await repo.getJob(jobId);
  if (!job || !job.closedAt) {
    console.warn(`[jobs/install] ignored installed for job ${jobId}: job is not closed`);
    return { claimed: false, closed: false, advanced: { closed: false, completed: false }, balanceRequest: null };
  }

  const claimed = await repo.claimJobInstalled(jobId, installedDate);
  const advanced = await advanceJobLifecycle(repo, jobId);

  let balanceRequest: SentPaymentRequest | null = null;
  try {
    balanceRequest = await requestPaymentIfOwed(repo, jobId, "balance");
  } catch (error) {
    console.error("[jobs/install] balance request failed (non-fatal)", error);
  }
  return { claimed, closed: true, advanced, balanceRequest };
}
