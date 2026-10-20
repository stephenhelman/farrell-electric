import { formatMoney } from "@/lib/app/format";
import type { PublicQuoteLineItem } from "@/lib/app/repo/types";
import styles from "./PublicLineItems.module.css";

interface Props {
  /** The public-safe shape only — no cost/profit/margin/revenue can reach this component. */
  lineItems: PublicQuoteLineItem[];
  subtotal: number;
  discount: number;
  /** Label for the final row, e.g. "Total" or "Amount Due". */
  totalLabel: string;
  total: number;
}

/** Customer-facing line items + totals. Shared by /q. Subtotal and Discount rows appear only when there is a discount (same as the SOW). */
export function PublicLineItems({ lineItems, subtotal, discount, totalLabel, total }: Props) {
  return (
    <>
      <div className={styles.items}>
        {lineItems.map((item, index) => (
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
        {discount > 0 ? (
          <>
            <div className={styles.sumRow}>
              <span>Subtotal</span>
              <span>{formatMoney(subtotal)}</span>
            </div>
            <div className={styles.sumRow}>
              <span>Discount</span>
              <span>-{formatMoney(discount)}</span>
            </div>
          </>
        ) : null}
        <div className={`${styles.sumRow} ${styles.sumRowTotal}`}>
          <span>{totalLabel}</span>
          <span>{formatMoney(total)}</span>
        </div>
      </div>
    </>
  );
}
