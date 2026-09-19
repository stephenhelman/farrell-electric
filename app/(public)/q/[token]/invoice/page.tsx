import { notFound } from "next/navigation";
import { getRepo } from "@/lib/app/repo";
import { formatMoney } from "@/lib/app/format";
import styles from "../page.module.css";

export default async function PublicInvoicePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const repo = await getRepo();
  const invoice = await repo.getInvoiceByPublicToken(token);

  if (!invoice) notFound();

  return (
    <main className={styles.page}>
      <div className={styles.card}>
        <div className={styles.brand}>Farrell Electric</div>
        <div className={styles.eyebrow}>
          Invoice {invoice.invoiceNumber} &middot; Quote #{invoice.quoteNumber}
        </div>
        <h1 className={styles.heading}>{invoice.customerName}</h1>
        {invoice.customerAddress ? <p className={styles.address}>{invoice.customerAddress}</p> : null}

        <div className={styles.items}>
          {invoice.lineItems.map((item, index) => (
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
            <span>{formatMoney(invoice.subtotal)}</span>
          </div>
          {invoice.discount ? (
            <div className={styles.sumRow}>
              <span>Discount</span>
              <span>-{formatMoney(invoice.discount)}</span>
            </div>
          ) : null}
          <div className={`${styles.sumRow} ${styles.sumRowTotal}`}>
            <span>Amount Due</span>
            <span>{formatMoney(invoice.total)}</span>
          </div>
        </div>

        {invoice.scopeOfWork ? (
          <div className={styles.scope}>
            <h2 className={styles.scopeHeading}>Scope of Work</h2>
            <p className={styles.scopeBody}>{invoice.scopeOfWork}</p>
          </div>
        ) : null}
      </div>
    </main>
  );
}
