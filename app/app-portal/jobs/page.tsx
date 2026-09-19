import { getRepo } from "@/lib/app/repo";
import { formatMoney } from "@/lib/app/format";
import { StatusPill } from "@/components/app/StatusPill";
import styles from "./page.module.css";

export default async function JobsPage() {
  const repo = await getRepo();
  const jobs = await repo.listJobs();

  return (
    <div>
      <h1 className={styles.heading}>Jobs</h1>
      {jobs.length === 0 ? (
        <p className={styles.empty}>Accepted quotes will appear here.</p>
      ) : (
        <ul className={styles.list}>
          {jobs.map((job) => (
            <li key={job.id} className={styles.row}>
              <div>
                <div className={styles.title}>
                  Job #{job.quoteNumber} &middot; {job.customerName}
                </div>
                <div className={styles.meta}>{job.customerAddress}</div>
              </div>
              <div className={styles.right}>
                <div className={styles.total}>{formatMoney(job.total)}</div>
                <StatusPill status={job.status} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
