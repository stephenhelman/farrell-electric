import { notFound } from "next/navigation";
import Link from "next/link";
import { getRepo } from "@/lib/app/repo";
import { formatMoney } from "@/lib/app/format";
import { StatusPill } from "@/components/app/StatusPill";
import styles from "./page.module.css";

function projectDetails(details: { type: "lighting" | "electrical" }): string | null {
  if (details.type === "lighting") {
    return (details as unknown as { projectDetails: string }).projectDetails;
  }
  return (details as unknown as { description: string }).description;
}

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const repo = await getRepo();
  const lead = await repo.getLeadById(id);
  if (!lead) notFound();

  const quotes = await repo.listQuotesByLeadId(id);

  return (
    <div>
      <div className={styles.header}>
        <div>
          <div className={styles.eyebrow}>Lead</div>
          <h1 className={styles.heading}>{lead.name}</h1>
        </div>
        <StatusPill status={lead.status} />
      </div>

      <div className={styles.section}>
        <div className={styles.sectionTitle}>Contact</div>
        <div className={styles.field}>
          <span className={styles.fieldLabel}>Phone</span>
          <span>{lead.phone}</span>
        </div>
        <div className={styles.field}>
          <span className={styles.fieldLabel}>Email</span>
          <span>{lead.email ?? "—"}</span>
        </div>
        <div className={styles.field}>
          <span className={styles.fieldLabel}>Property address</span>
          <span>{lead.propertyAddress ?? "—"}</span>
        </div>
        <div className={styles.field}>
          <span className={styles.fieldLabel}>Type</span>
          <span>{lead.leadType}</span>
        </div>
        <div className={styles.field}>
          <span className={styles.fieldLabel}>Submitted</span>
          <span>{lead.createdAt.toISOString().slice(0, 10)}</span>
        </div>
        <div className={styles.field}>
          <span className={styles.fieldLabel}>Source</span>
          <span>{lead.source}</span>
        </div>
        <div className={styles.field}>
          <span className={styles.fieldLabel}>Project details</span>
          <span>{projectDetails(lead.details) || "—"}</span>
        </div>
      </div>

      <div className={styles.section}>
        <div className={styles.sectionTitle}>Consent</div>
        <div className={styles.tags}>
          <span className={styles.tag}>
            Transactional SMS: {lead.smsConsentTransactional ? "yes" : "no"}
          </span>
          <span className={styles.tag}>
            Promotional SMS: {lead.smsConsentPromotional ? "yes" : "no"}
          </span>
        </div>
      </div>

      <div className={styles.section}>
        <div className={styles.sectionTitle}>GHL mirror</div>
        <div className={styles.field}>
          <span className={styles.fieldLabel}>Contact ID</span>
          <span>{lead.ghlContactId ?? "not yet synced"}</span>
        </div>
        <div className={styles.field}>
          <span className={styles.fieldLabel}>Opportunity ID</span>
          <span>{lead.ghlOpportunityId ?? "not yet synced"}</span>
        </div>
      </div>

      <div className={styles.section}>
        <Link href={`/quotes/new?leadId=${lead.id}`} className={styles.createQuoteButton}>
          Create Quote
        </Link>
      </div>

      <div className={styles.section}>
        <div className={styles.sectionTitle}>Quotes from this lead</div>
        {quotes.length === 0 ? (
          <p className={styles.empty}>No quotes yet.</p>
        ) : (
          <ul className={styles.list}>
            {quotes.map((quote) => (
              <li key={quote.id}>
                <Link href={`/quotes/${quote.id}`} className={styles.row}>
                  <span>
                    #{quote.number} &middot; {quote.createdAt.toISOString().slice(0, 10)}
                  </span>
                  <span>{formatMoney(quote.total)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
