import { notFound } from "next/navigation";
import Link from "next/link";
import { getRepo } from "@/lib/app/repo";
import { formatMoney } from "@/lib/app/format";
import { balanceDue, jobStage } from "@/lib/app/jobs/lifecycle";
import { StatusPill } from "@/components/app/StatusPill";
import { resolveScopeOfWork } from "@/lib/app/jobs/contract";
import { ActualCostForm } from "./ActualCostForm";
import { GenerateContract } from "./GenerateContract";
import styles from "./page.module.css";

function formatDate(date: Date | null): string {
  return date ? date.toISOString().slice(0, 10) : "—";
}

function titleCase(value: string): string {
  return value.charAt(0) + value.slice(1).toLowerCase();
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className={styles.field}>
      <span className={styles.fieldLabel}>{label}</span>
      <span className={styles.fieldValue}>{children}</span>
    </div>
  );
}

export default async function JobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const repo = await getRepo();
  const job = await repo.getJob(id);
  if (!job) notFound();

  const quote = await repo.getQuote(job.quoteId);
  const termsSet = job.paymentType !== null;
  const remaining = balanceDue(job);
  const margin = job.actualCost === null ? null : job.revenue - job.actualCost;
  const marginPct = margin === null || job.revenue === 0 ? null : (margin / job.revenue) * 100;

  return (
    <div>
      <div className={styles.header}>
        <div>
          <div className={styles.eyebrow}>Job &middot; Quote #{job.quoteNumber}</div>
          <h1 className={styles.heading}>{job.customerName}</h1>
        </div>
        <div className={styles.pills}>
          <StatusPill status={job.status} />
          <span className={styles.stage}>{jobStage(job)}</span>
        </div>
      </div>

      <div className={styles.section}>
        <div className={styles.sectionTitle}>Accepted quote</div>
        <Field label="Quote">
          <Link href={`/quotes/${job.quoteId}`} className={styles.link}>
            #{job.quoteNumber}
          </Link>
        </Field>
        <Field label="Total">{formatMoney(job.total)}</Field>
        {quote && quote.lineItems.length > 0 ? (
          <ul className={styles.lines}>
            {quote.lineItems.map((item) => (
              <li key={item.id} className={styles.line}>
                <span>
                  {item.qty === 1 ? "" : `${item.qty}× `}
                  {item.name}
                </span>
                <span>{formatMoney(item.qty * item.unitPrice)}</span>
              </li>
            ))}
          </ul>
        ) : null}
        {quote?.scopeOfWork ? <p className={styles.scope}>{quote.scopeOfWork}</p> : null}
      </div>

      <div className={styles.section}>
        <div className={styles.sectionTitle}>Client</div>
        <Field label="Name">{job.customerName}</Field>
        <Field label="Phone">{quote?.customerPhone || "—"}</Field>
        <Field label="Email">{quote?.customerEmail || "—"}</Field>
        <Field label="Address">{job.customerAddress || "—"}</Field>
      </div>

      <div className={styles.section}>
        <div className={styles.sectionTitle}>Deal terms</div>
        {termsSet ? (
          <>
            <Field label="Payment type">{titleCase(job.paymentType ?? "")}</Field>
            <Field label="Deposit">
              {job.depositRequired ? formatMoney(job.depositAmount ?? 0) : "Not required"}
            </Field>
          </>
        ) : (
          <p className={styles.empty}>Not set yet — captured when the contract is generated.</p>
        )}
      </div>

      <div className={styles.section}>
        <div className={styles.sectionTitle}>Contract</div>
        <Field label="Status">{titleCase(job.contractStatus)}</Field>
        <Field label="Sent">{formatDate(job.contractSentAt)}</Field>
        <Field label="Signed">{formatDate(job.contractSignedAt)}</Field>
        <GenerateContract
          jobId={job.id}
          contractStatus={job.contractStatus}
          initial={{
            paymentType: job.paymentType ?? "",
            depositRequired: job.depositRequired,
            depositAmount: job.depositAmount,
            customerName: job.customerName,
            customerPhone: quote?.customerPhone ?? "",
            customerEmail: quote?.customerEmail ?? "",
            customerAddress: job.customerAddress,
          }}
          scopeOfWork={quote ? resolveScopeOfWork(quote) : ""}
        />
      </div>

      <div className={styles.section}>
        <div className={styles.sectionTitle}>Payments</div>
        <Field label="Deposit paid">
          {job.depositRequired
            ? job.depositPaid
              ? `Yes · ${formatDate(job.depositPaidAt)}`
              : "No"
            : "N/A — no deposit required"}
        </Field>
        <Field label="Balance due after deposit">{formatMoney(Math.max(remaining, 0))}</Field>
        <Field label="Final invoice paid">
          {job.finalInvoicePaid ? `Yes · ${formatDate(job.finalInvoicePaidAt)}` : "No"}
        </Field>
      </div>

      <div className={styles.section}>
        <div className={styles.sectionTitle}>Install</div>
        <Field label="Scheduled">{formatDate(job.installScheduledDate)}</Field>
        <Field label="Installed (warranty start)">{formatDate(job.installedDate)}</Field>
      </div>

      <div className={`${styles.section} ${styles.internal}`}>
        <div className={styles.sectionTitle}>Financials &middot; internal, rep only</div>
        <Field label="Revenue">{formatMoney(job.revenue)}</Field>
        <ActualCostForm jobId={job.id} initial={job.actualCost} />
        <Field label="Margin">
          {margin === null
            ? "—"
            : `${formatMoney(margin)}${marginPct === null ? "" : ` (${marginPct.toFixed(1)}%)`}`}
        </Field>
      </div>
    </div>
  );
}
