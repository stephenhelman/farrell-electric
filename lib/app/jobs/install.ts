import type { Repo } from "@/lib/app/repo/types";
import { advanceJobLifecycle, type AdvanceResult } from "./gates";
import { requestPaymentIfOwed, type SentPaymentRequest } from "./requests";

export interface MarkInstalledResult {
  /** True only for the call that stamped installedDate; a repeat is a no-op (false). */
  claimed: boolean;
  advanced: AdvanceResult;
  /** The balance request sent by this call, or null (not claimed / nothing owed). */
  balanceRequest: SentPaymentRequest | null;
}

/**
 * THE install-completion path — shared by the inbound GHL `installed` echo and
 * the rep's in-app "Mark Installed". Claim-style: installedDate is stamped
 * atomically only if still null, and only the winning call requests the
 * balance, so an app click plus a stray echo can't double-fire. The lifecycle
 * gates always run afterwards (exactly-once via their own claims), so a
 * re-delivery still re-checks harmlessly. A balance-request failure is
 * non-fatal: the fact is written and a retry would lose the claim anyway.
 */
export async function markJobInstalled(repo: Repo, jobId: string, installedDate: Date): Promise<MarkInstalledResult> {
  const claimed = await repo.claimJobInstalled(jobId, installedDate);
  const advanced = await advanceJobLifecycle(repo, jobId);

  let balanceRequest: SentPaymentRequest | null = null;
  if (claimed) {
    try {
      balanceRequest = await requestPaymentIfOwed(repo, jobId, "balance");
    } catch (error) {
      console.error("[jobs/install] balance request failed (non-fatal)", error);
    }
  }
  return { claimed, advanced, balanceRequest };
}
