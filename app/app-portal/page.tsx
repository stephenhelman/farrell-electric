import { getRepo } from "@/lib/app/repo";
import { formatMoney } from "@/lib/app/format";
import styles from "./page.module.css";

export default async function DashboardPage() {
  const repo = await getRepo();
  const [quotes, jobs] = await Promise.all([repo.listQuotes(), repo.listJobs()]);

  const open = quotes.filter((q) => q.status === "DRAFT" || q.status === "SENT");
  const sold = quotes.filter((q) => q.status === "ACCEPTED");
  const closed = quotes.filter((q) => q.status === "ACCEPTED" || q.status === "DECLINED");
  const scheduled = jobs.filter((j) => j.status === "SCHEDULED");
  const closeRate = closed.length > 0 ? Math.round((sold.length / closed.length) * 100) : 0;
  const recentQuotes = quotes.slice(0, 6);

  return (
    <div>
      <h1 className={styles.heading}>Dashboard</h1>
      <div className={styles.grid}>
        <div className={styles.card}>
          <div className={styles.label}>Open quotes</div>
          <div className={styles.metric}>{open.length}</div>
        </div>
        <div className={styles.card}>
          <div className={styles.label}>Sold</div>
          <div className={styles.metric}>{formatMoney(sold.reduce((sum, q) => sum + q.total, 0))}</div>
        </div>
        <div className={styles.card}>
          <div className={styles.label}>Scheduled</div>
          <div className={styles.metric}>{scheduled.length}</div>
        </div>
        <div className={styles.card}>
          <div className={styles.label}>Close rate</div>
          <div className={styles.metric}>{closeRate}%</div>
        </div>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionHeading}>Recent Quotes</h2>
        {recentQuotes.length === 0 ? (
          <p className={styles.empty}>No quotes yet.</p>
        ) : (
          <ul className={styles.list}>
            {recentQuotes.map((quote) => (
              <li key={quote.id} className={styles.listRow}>
                <span>{quote.customerName}</span>
                <span>{formatMoney(quote.total)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
