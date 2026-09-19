import { notFound } from "next/navigation";
import { getRepo } from "@/lib/app/repo";
import { formatMoney } from "@/lib/app/format";
import styles from "./page.module.css";

export default async function PublicQuotePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const repo = await getRepo();
  const quote = await repo.getQuoteByPublicToken(token);

  if (!quote) notFound();

  return (
    <main className={styles.page}>
      <div className={styles.card}>
        <div className={styles.brand}>Farrell Electric</div>
        <div className={styles.eyebrow}>Quote #{quote.number}</div>
        <h1 className={styles.heading}>{quote.customerName}</h1>
        {quote.customerAddress ? <p className={styles.address}>{quote.customerAddress}</p> : null}

        {quote.message ? <p className={styles.message}>{quote.message}</p> : null}

        <div className={styles.items}>
          {quote.lineItems.map((item, index) => (
            <div key={index} className={styles.item}>
              <div>
                <div className={styles.itemName}>
                  {item.qty}&times; {item.name}
                </div>
                {item.description ? <div className={styles.itemDesc}>{item.description}</div> : null}
              </div>
              <div className={styles.itemPrice}>{formatMoney(item.qty * item.unitPrice)}</div>
            </div>
          ))}
        </div>

        <div className={styles.totals}>
          <div className={styles.sumRow}>
            <span>Subtotal</span>
            <span>{formatMoney(quote.subtotal)}</span>
          </div>
          {quote.discount ? (
            <div className={styles.sumRow}>
              <span>Discount</span>
              <span>-{formatMoney(quote.discount)}</span>
            </div>
          ) : null}
          <div className={`${styles.sumRow} ${styles.sumRowTotal}`}>
            <span>Total</span>
            <span>{formatMoney(quote.total)}</span>
          </div>
        </div>

        {quote.scopeOfWork ? (
          <div className={styles.scope}>
            <h2 className={styles.scopeHeading}>Scope of Work</h2>
            <p className={styles.scopeBody}>{quote.scopeOfWork}</p>
          </div>
        ) : null}
      </div>
    </main>
  );
}
