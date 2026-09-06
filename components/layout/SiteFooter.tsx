import Link from "next/link";
import Image from "next/image";
import { getSiteSettings } from "@/lib/content";
import styles from "./SiteFooter.module.css";

export function SiteFooter() {
  const { navItems, phone, cellPhone, email, serviceAreaLine, logoPath } = getSiteSettings();
  const year = new Date().getFullYear();

  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div>
          <Image src={logoPath} alt="Farrell Electric" width={160} height={135} className={styles.brand} />
          <div className={styles.contact}>
            <a href={`tel:${phone.replace(/[^\d+]/g, "")}`}>Office: {phone}</a>
            <a href={`sms:${cellPhone.replace(/[^\d+]/g, "")}`}>Direct: {cellPhone} (text)</a>
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
