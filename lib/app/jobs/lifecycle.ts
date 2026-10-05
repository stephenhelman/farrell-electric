import type { RepoJob } from "@/lib/app/repo/types";

/**
 * The lifecycle gate predicates. Pure — they read the Job flags only, so the
 * server (not GHL workflow timing) decides, and any event order works: each
 * inbound event writes its flag and then re-checks the gate.
 *
 * "Has the gate already fired" is NOT decided here — that is closedAt /
 * completedAt, claimed atomically through the repo.
 */

type GateInput = Pick<
  RepoJob,
  | "revenue"
  | "contractStatus"
  | "depositRequired"
  | "depositAmount"
  | "depositPaid"
  | "installedDate"
  | "finalInvoicePaid"
>;

/** What remains after the deposit: revenue - (depositRequired ? depositAmount : 0). <= 0 means none due. */
export function balanceDue(job: Pick<GateInput, "revenue" | "depositRequired" | "depositAmount">): number {
  const deposit = job.depositRequired ? (job.depositAmount ?? 0) : 0;
  return job.revenue - deposit;
}

/** Closed = contract signed AND (deposit paid OR no deposit required). */
export function closeGateMet(job: GateInput): boolean {
  return job.contractStatus === "SIGNED" && (job.depositPaid || !job.depositRequired);
}

/** Complete = installed AND (final invoice paid OR no balance due). */
export function completeGateMet(job: GateInput): boolean {
  return job.installedDate !== null && (job.finalInvoicePaid || balanceDue(job) <= 0);
}
