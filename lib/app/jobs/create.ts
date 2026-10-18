import type { Repo } from "@/lib/app/repo/types";
import { dispatchJobCreated } from "@/lib/app/ghl/dispatch-job";
import { resolveScopeOfWork } from "@/lib/app/jobs/contract";
import { buildSowInput } from "@/lib/app/sow/input";
import type { SowInput } from "@/lib/app/sow/render";

export type CreateJobResult =
  | { ok: true; jobId: string; created: boolean; /** Set when the SOW PDF couldn't be produced/stored; the job exists regardless. */ warning: string | null }
  | { ok: false; error: string };

/** Seams for tests; production uses the real renderer and Blob helper (loaded lazily — react-pdf is heavy). */
export interface CreateJobDeps {
  renderSowPdf?: (input: SowInput) => Promise<Uint8Array>;
  putDocument?: (pathPrefix: string, data: Uint8Array, contentType: string) => Promise<{ url: string } | null>;
}

/**
 * The ONLY job-creation path (createJobAction wraps it). Exactly-once: only the
 * call that actually inserted the Job (`created`) generates the SOW and fires
 * job.created; a repeat returns the existing job and does nothing else.
 *
 * SOW generation is best-effort. A render or upload failure — or Blob being
 * unconfigured — is logged and reported as a warning, never rolls the job back,
 * and job.created still fires (sowUrl null).
 */
export async function createJobForQuote(repo: Repo, quoteId: string, deps: CreateJobDeps = {}): Promise<CreateJobResult> {
  const ensured = await repo.ensureJobForQuote(quoteId);
  if (!ensured) return { ok: false, error: "Only an accepted quote can have a job." };
  if (!ensured.created) return { ok: true, jobId: ensured.id, created: false, warning: null };

  let warning: string | null = null;
  try {
    const quote = await repo.getQuote(quoteId);
    if (!quote) throw new Error("accepted quote disappeared");

    const render = deps.renderSowPdf ?? (await import("@/lib/app/sow/render")).renderSowPdf;
    const put = deps.putDocument ?? (await import("@/lib/app/blob")).putDocument;

    // Same text the contract uses: the stored SOW if the owner edited it, else generated from line items.
    const input = buildSowInput(quote);
    input.quote.scopeOfWork = resolveScopeOfWork(quote);

    const pdf = await render(input);
    const stored = await put(`sow/quote-${quote.number}.pdf`, pdf, "application/pdf");
    if (stored) {
      await repo.updateJob(ensured.id, { sowUrl: stored.url, sowGeneratedAt: new Date() });
    } else {
      warning = "The scope-of-work PDF wasn't stored (file storage isn't configured or the upload failed).";
    }
  } catch (error) {
    console.error("[jobs/create] SOW generation failed (non-fatal)", error);
    warning = "The scope-of-work PDF couldn't be generated.";
  }

  const job = await repo.getJob(ensured.id);
  if (job) await dispatchJobCreated(job);

  return { ok: true, jobId: ensured.id, created: true, warning };
}
