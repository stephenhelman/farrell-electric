import { notFound } from "next/navigation";
import { getRepo } from "@/lib/app/repo";
import { PublicLineItems } from "@/components/public/PublicLineItems";
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

        <PublicLineItems
          lineItems={invoice.lineItems}
          subtotal={invoice.subtotal}
          discount={invoice.discount}
          totalLabel="Amount Due"
          total={invoice.total}
        />

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
