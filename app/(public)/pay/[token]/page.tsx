import { notFound } from "next/navigation";
import { getRepo } from "@/lib/app/repo";
import { formatMoney } from "@/lib/app/format";
import {
  CHECK_MAILING_ADDRESS,
  CHECK_PAYEE,
  FINANCING_URL,
  PAY_CARD_ENABLED,
  ZELLE_HANDLE,
} from "@/lib/app/pay/constants";
import { LicenseLine } from "@/components/trust/LicenseLine";
import styles from "./page.module.css";

function titleCase(value: string): string {
  return value.charAt(0) + value.slice(1).toLowerCase();
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

/**
 * Public, unauthenticated by design: the unguessable payToken IS the
 * authorization (same posture as /q/[token]). Offline methods need no server
 * action — the customer pays, and a rep confirms receipt with Record Payment.
 */
export default async function PayPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const repo = await getRepo();
  const pay = await repo.getPayContextByToken(token);

  if (!pay) notFound();

  const ref = pay.referenceNumber;

  return (
    <main className={styles.page}>
      <div className={styles.card}>
        <div className={styles.brand}>Farrell Electric</div>
        <LicenseLine className={styles.license} />
        <div className={styles.eyebrow}>Payment &middot; Quote #{ref}</div>
        <h1 className={styles.heading}>{pay.customerName}</h1>

        {pay.due ? (
          <div className={styles.due}>
            <div className={styles.dueLabel}>{pay.due.kind === "deposit" ? "Deposit due" : "Balance due"}</div>
            <div className={styles.dueAmount}>{formatMoney(pay.due.amount)}</div>
            <p className={styles.dueMeta}>
              Reference: Quote #{ref}
              {pay.sowUrl ? (
                <>
                  {" "}
                  &middot;{" "}
                  <a href={pay.sowUrl} className={styles.link} target="_blank" rel="noreferrer">
                    View scope of work
                  </a>
                </>
              ) : null}
            </p>
          </div>
        ) : (
          <div className={styles.settled}>
            {pay.payments.length > 0 ? "Paid in full — thank you." : "Nothing is due right now."}
          </div>
        )}

        {pay.due ? (
          <div className={styles.methods}>
            <div className={styles.methodsHeading}>Ways to pay</div>

            <section className={styles.method}>
              <div className={styles.methodTitle}>Check</div>
              <p className={styles.methodBody}>
                Make it payable to <span className={styles.strong}>{CHECK_PAYEE}</span>, write Quote #{ref} on the
                memo line, and mail it to:
              </p>
              <p className={`${styles.methodBody} ${styles.mailing}`}>{CHECK_MAILING_ADDRESS.join("\n")}</p>
            </section>

            <section className={styles.method}>
              <div className={styles.methodTitle}>Zelle</div>
              <p className={styles.methodBody}>
                Send to <span className={styles.strong}>{ZELLE_HANDLE}</span> and put{" "}
                <span className={styles.strong}>Quote #{ref}</span> in the memo.
              </p>
            </section>

            {/* Card is scaffolded but OFF: Task 6 (QuickBooks) turns PAY_CARD_ENABLED on and
                replaces this body with the payment link. Nothing here collects card data. */}
            {PAY_CARD_ENABLED ? (
              <section className={styles.method}>
                <div className={styles.methodTitle}>Credit or debit card</div>
                <p className={styles.methodBody}>Pay securely online.</p>
              </section>
            ) : null}

            <section className={styles.method}>
              <div className={styles.methodTitle}>Financing</div>
              <p className={styles.methodBody}>
                Prefer to spread it out?{" "}
                <a href={FINANCING_URL} className={styles.link}>
                  Apply for financing
                </a>
                .
              </p>
            </section>

            <p className={styles.footnote}>
              Once your payment arrives we&apos;ll confirm it and this page will update.
            </p>
          </div>
        ) : null}

        {pay.payments.length > 0 ? (
          <div className={styles.history}>
            <div className={styles.historyHeading}>Payments received</div>
            {pay.payments.map((payment, index) => (
              <div key={index} className={styles.historyRow}>
                <span>
                  {formatDate(payment.paidAt)} &middot; {titleCase(payment.method)}
                </span>
                <span>{formatMoney(payment.amount)}</span>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </main>
  );
}
