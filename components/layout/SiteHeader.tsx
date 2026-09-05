import Link from "next/link";
import { getSiteSettings } from "@/lib/content";
import { Button } from "@/components/ui/Button";
import { MobileMenu } from "./MobileMenu";
import styles from "./SiteHeader.module.css";

export function SiteHeader() {
  const { navItems, primaryCta, secondaryCta } = getSiteSettings();

  return (
    <header className={styles.header}>
      <div className={styles.bar}>
        <Link href="/" className={styles.logo}>
          FARRELL ELECTRIC
        </Link>

        <nav className={styles.desktopNav}>
          {navItems.map((item) => (
            <Link key={item.href} href={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className={styles.desktopCtas}>
          <Button href={secondaryCta.href} variant="secondary">
            {secondaryCta.label}
          </Button>
          <Button href={primaryCta.href} variant="primary">
            {primaryCta.label}
          </Button>
        </div>

        <MobileMenu navItems={navItems} primaryCta={primaryCta} secondaryCta={secondaryCta} />
      </div>
    </header>
  );
}
