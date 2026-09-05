import Link from "next/link";
import { getSiteSettings } from "@/lib/content";
import styles from "./SiteFooter.module.css";

export function SiteFooter() {
  const { navItems, phone, textNumber, email, serviceAreaLine } = getSiteSettings();
  const year = new Date().getFullYear();

  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div>
          <p className={styles.brand}>FARRELL ELECTRIC</p>
          <div className={styles.contact}>
            <a href={`tel:${phone.replace(/[^\d+]/g, "")}`}>{phone}</a>
            <a href={`sms:${textNumber.replace(/[^\d+]/g, "")}`}>{textNumber} (text)</a>
            <a href={`mailto:${email}`}>{email}</a>
            <span>{serviceAreaLine}</span>
          </div>
        </div>

        <nav className={styles.navGrid}>
          {navItems.map((item) => (
            <Link key={item.href} href={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>
      </div>

      <div className={styles.bottomBar}>
        © {year} Farrell Electric, Inc. Serving South Florida since 1993.
      </div>
    </footer>
  );
}
