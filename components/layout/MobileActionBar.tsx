import { getSiteSettings } from "@/lib/content";
import styles from "./MobileActionBar.module.css";

function digitsOnly(value: string): string {
  return value.replace(/[^\d+]/g, "");
}

export function MobileActionBar() {
  const { phone, textNumber, primaryCta } = getSiteSettings();

  return (
    <div className={styles.bar}>
      <a className={styles.action} href={`tel:${digitsOnly(phone)}`}>
        <span aria-hidden="true">📞</span>
        Call
      </a>
      <a className={styles.action} href={`sms:${digitsOnly(textNumber)}`}>
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
