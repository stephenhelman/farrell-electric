import Link from "next/link";
import Image from "next/image";
import { getSiteSettings } from "@/lib/content";
import { HeaderCtaModal } from "./HeaderCtaModal";
import { MobileMenu } from "./MobileMenu";
import styles from "./SiteHeader.module.css";

export function SiteHeader() {
  const { navItems, primaryCta, secondaryCta, logoPath } = getSiteSettings();

  return (
    <header className={styles.header}>
      <div className={styles.bar}>
        <Link href="/" className={styles.logo}>
          <Image src={logoPath} alt="Farrell Electric" width={160} height={135} priority />
        </Link>

        <nav className={styles.desktopNav}>
          {navItems.map((item) => (
            <Link key={item.href} href={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className={styles.desktopCta}>
          <HeaderCtaModal primaryCta={primaryCta} secondaryCta={secondaryCta} />
        </div>

        <MobileMenu navItems={navItems} primaryCta={primaryCta} secondaryCta={secondaryCta} />
      </div>
    </header>
  );
}
