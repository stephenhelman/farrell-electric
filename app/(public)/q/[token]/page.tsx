import { notFound } from "next/navigation";
import { getRepo } from "@/lib/app/repo";
import { PublicLineItems } from "@/components/public/PublicLineItems";
import { RenderGallery } from "./RenderGallery";
import { QuoteResponse } from "./QuoteResponse";
import { LicenseLine } from "@/components/trust/LicenseLine";
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
        <LicenseLine className={styles.license} />
        <div className={styles.eyebrow}>Quote #{quote.number}</div>
        <h1 className={styles.heading}>{quote.customerName}</h1>
        {quote.customerAddress ? <p className={styles.address}>{quote.customerAddress}</p> : null}

        {quote.message ? <p className={styles.message}>{quote.message}</p> : null}

        <PublicLineItems
          lineItems={quote.lineItems}
          subtotal={quote.subtotal}
          discount={quote.discount}
          totalLabel="Total"
          total={quote.total}
        />

        {quote.scopeOfWork ? (
          <div className={styles.scope}>
            <h2 className={styles.scopeHeading}>Scope of Work</h2>
            <p className={styles.scopeBody}>{quote.scopeOfWork}</p>
          </div>
        ) : null}

        {quote.renders.length > 0 ? <RenderGallery urls={quote.renders.map((r) => r.url)} /> : null}

        <QuoteResponse token={token} status={quote.status} />
      </div>
    </main>
  );
}
