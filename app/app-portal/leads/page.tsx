import Link from "next/link";
import { getRepo } from "@/lib/app/repo";
import styles from "./page.module.css";

export default async function LeadsPage() {
  const repo = await getRepo();
  const leads = await repo.listLeads();

  return (
    <div>
      <h1 className={styles.heading}>Leads</h1>
      <p className={styles.subhead}>Everyone who submitted the contact form wanting a quote.</p>
      {leads.length === 0 ? (
        <p className={styles.empty}>No leads yet.</p>
      ) : (
        <ul className={styles.list}>
          {leads.map((lead) => (
            <li key={lead.id}>
              <Link href={`/leads/${lead.id}`} className={styles.row}>
                <div className={styles.rowTop}>
                  <div className={styles.title}>{lead.name}</div>
                  <div className={styles.meta}>{lead.createdAt.toISOString().slice(0, 10)}</div>
                </div>
                <div className={styles.meta}>
                  {[lead.phone, lead.email, lead.propertyAddress].filter(Boolean).join(" · ")}
                </div>
                <div className={styles.tags}>
                  <span className={styles.tag}>{lead.leadType}</span>
                  <span className={styles.tag}>{lead.status}</span>
                  {lead.smsConsentTransactional ? <span className={styles.tag}>SMS: transactional</span> : null}
                  {lead.smsConsentPromotional ? <span className={styles.tag}>SMS: promotional</span> : null}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
