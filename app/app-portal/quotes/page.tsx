import Link from "next/link";
import { getRepo } from "@/lib/app/repo";
import { formatMoney } from "@/lib/app/format";
import { StatusPill } from "@/components/app/StatusPill";
import { QuoteRowActions } from "./QuoteRowActions";
import styles from "./page.module.css";

export default async function QuotesPage() {
  const repo = await getRepo();
  const quotes = await repo.listQuotes();

  return (
    <div>
      <div className={styles.header}>
        <h1 className={styles.heading}>Quotes</h1>
        <div className={styles.headerActions}>
          <Link href="/quotes/estimate" className={styles.newButton}>
            Guided Estimate
          </Link>
          <Link href="/quotes/new" className={styles.newButton}>
            + Quote
          </Link>
        </div>
      </div>
      {quotes.length === 0 ? (
        <p className={styles.empty}>No quotes yet.</p>
      ) : (
        <ul className={styles.list}>
          {quotes.map((quote) => (
            <li key={quote.id} className={styles.row}>
              <div className={styles.rowTop}>
                <Link href={`/quotes/${quote.id}`} className={styles.rowLink}>
                  <div className={styles.title}>
                    #{quote.number} &middot; {quote.customerName}
                  </div>
                  <div className={styles.meta}>{quote.createdAt.toISOString().slice(0, 10)}</div>
                </Link>
                <div className={styles.right}>
                  <div className={styles.total}>{formatMoney(quote.total)}</div>
                  <StatusPill status={quote.status} />
                </div>
              </div>
              {quote.status === "DRAFT" || quote.status === "SENT" ? (
                <QuoteRowActions quoteId={quote.id} />
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
