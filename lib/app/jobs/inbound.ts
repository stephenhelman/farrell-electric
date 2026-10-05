import type { JobUpdateInput, RepoJob } from "@/lib/app/repo/types";

/**
 * The world events GHL reports back about a job. Task 5 only RECORDS them;
 * whether a deal closes or a job completes is the gates' call (Task 6).
 */
export const JOB_ACTIONS = [
  "contract_signed",
  "deposit_paid",
  "install_scheduled",
  "installed",
  "final_paid",
] as const;

export type JobAction = (typeof JOB_ACTIONS)[number];

export function isJobAction(value: unknown): value is JobAction {
  return typeof value === "string" && (JOB_ACTIONS as readonly string[]).includes(value);
}

/**
 * Turns one inbound event into the Job fields to write. Pure.
 *
 * Idempotency lives here: a fact that's already recorded yields an EMPTY patch,
 * so a re-delivery writes nothing — it can never move contractSignedAt,
 * depositPaidAt, finalInvoicePaidAt, or the warranty start (installedDate).
 * The one deliberate exception is install_scheduled, which overwrites the date
 * because installs get rescheduled; delivering the same date again is still a no-op.
 *
 * Events are recorded as facts regardless of order or relevance (a signature
 * with no generated contract, a deposit payment when none was required) — the
 * lifecycle gates decide what matters.
 *
 * `occurredAt` stamps the fact; `scheduledDate` is the install date itself and
 * is required for install_scheduled.
 */
export function buildJobEventPatch(
  job: Pick<
    RepoJob,
    "status" | "contractStatus" | "depositPaid" | "finalInvoicePaid" | "installScheduledDate" | "installedDate"
  >,
  action: JobAction,
  occurredAt: Date,
  scheduledDate: Date | null,
): JobUpdateInput {
  switch (action) {
    case "contract_signed":
      return job.contractStatus === "SIGNED"
        ? {}
        : { contractStatus: "SIGNED", contractSignedAt: occurredAt };

    case "deposit_paid":
      return job.depositPaid ? {} : { depositPaid: true, depositPaidAt: occurredAt };

    case "final_paid":
      return job.finalInvoicePaid ? {} : { finalInvoicePaid: true, finalInvoicePaidAt: occurredAt };

    case "installed":
      return job.installedDate ? {} : { installedDate: occurredAt };

    case "install_scheduled": {
      if (!scheduledDate) return {};
      const patch: JobUpdateInput = {};
      if (job.installScheduledDate?.getTime() !== scheduledDate.getTime()) {
        patch.installScheduledDate = scheduledDate;
      }
      // Never regress a job that has already moved past scheduling.
      if (job.status === "UNSCHEDULED") patch.status = "SCHEDULED";
      return patch;
    }
  }
}
