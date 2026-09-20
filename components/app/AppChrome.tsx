"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignOutButton } from "./SignOutButton";
import styles from "./AppChrome.module.css";

const NAV_ITEMS = [
  { href: "/", label: "Home" },
  { href: "/leads", label: "Leads" },
  { href: "/quotes", label: "Quotes" },
  { href: "/jobs", label: "Jobs" },
  { href: "/price-book", label: "Price Book" },
  { href: "/options", label: "Options" },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppChrome({
  children,
  userName,
}: {
  children: React.ReactNode;
  userName: string | null;
}) {
  const pathname = usePathname();
  const isSignIn = pathname === "/sign-in";
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  if (isSignIn) {
    return <div className={styles.bare}>{children}</div>;
  }

  return (
    <div className={styles.shell}>
      <header className={styles.topbar}>
        <span className={styles.brand}>Farrell Electric</span>
        <nav className={styles.nav} aria-label="Primary">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={isActive(pathname, item.href) ? styles.navItemActive : styles.navItem}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className={styles.topbarRight}>
          {userName ? <span className={styles.who}>{userName}</span> : null}
          <SignOutButton />
        </div>
        <button
          type="button"
          className={styles.menuToggle}
          aria-label="Open menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen(true)}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
            <path d="M2 4h14M2 9h14M2 14h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </header>

      <div className={`${styles.mobileMenu} ${menuOpen ? styles.mobileMenuOpen : ""}`} aria-hidden={!menuOpen}>
        <div className={styles.mobileMenuTopRow}>
          <button
            type="button"
            className={styles.closeButton}
            aria-label="Close menu"
            onClick={() => setMenuOpen(false)}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M2 2l12 12M14 2L2 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <nav className={styles.mobileNavList} aria-label="Primary">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={isActive(pathname, item.href) ? styles.mobileNavItemActive : styles.mobileNavItem}
              onClick={() => setMenuOpen(false)}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className={styles.mobileMenuFooter}>
          {userName ? <span className={styles.mobileWho}>{userName}</span> : null}
          <SignOutButton />
        </div>
      </div>

      <main className={styles.content}>{children}</main>
    </div>
  );
}
