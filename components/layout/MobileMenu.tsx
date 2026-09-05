"use client";

import { useState } from "react";
import Link from "next/link";
import type { Cta, NavItem } from "@/lib/content";
import { Button } from "@/components/ui/Button";
import styles from "./MobileMenu.module.css";
import headerStyles from "./SiteHeader.module.css";

export function MobileMenu({
  navItems,
  primaryCta,
  secondaryCta,
}: {
  navItems: NavItem[];
  primaryCta: Cta;
  secondaryCta: Cta;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className={headerStyles.menuToggle}
        aria-label="Open menu"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
          <path d="M2 4h14M2 9h14M2 14h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>

      <div className={`${styles.panel} ${open ? styles.panelOpen : ""}`} aria-hidden={!open}>
        <div className={styles.topRow}>
          <button
            type="button"
            className={styles.closeButton}
            aria-label="Close menu"
            onClick={() => setOpen(false)}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M2 2l12 12M14 2L2 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <nav className={styles.navList}>
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} onClick={() => setOpen(false)}>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className={styles.ctaRow}>
          <Button href={primaryCta.href} variant="primary" fullWidth onClick={() => setOpen(false)}>
            {primaryCta.label}
          </Button>
          <Button href={secondaryCta.href} variant="secondary" fullWidth onClick={() => setOpen(false)}>
            {secondaryCta.label}
          </Button>
        </div>
      </div>
    </>
  );
}
