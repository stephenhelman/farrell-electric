import { getSiteSettings } from "@/lib/content";
import styles from "./MobileActionBar.module.css";

function digitsOnly(value: string): string {
  return value.replace(/[^\d+]/g, "");
}

export function MobileActionBar() {
  const { cellPhone, primaryCta } = getSiteSettings();

  return (
    <div className={styles.bar}>
      <a className={styles.action} href={`tel:${digitsOnly(cellPhone)}`}>
        <span aria-hidden="true">📞</span>
        Call
      </a>
      <a className={styles.action} href={`sms:${digitsOnly(cellPhone)}`}>
        <span aria-hidden="true">💬</span>
        Text
      </a>
      <a className={`${styles.action} ${styles.estimateAction}`} href={primaryCta.href}>
        <span aria-hidden="true">💡</span>
        Estimate
      </a>
    </div>
  );
}
