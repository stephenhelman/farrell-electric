"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignOutButton } from "./SignOutButton";
import styles from "./AppChrome.module.css";

const NAV_ITEMS = [
  { href: "/", label: "Home" },
  { href: "/clients", label: "Clients" },
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
  userEmail,
}: {
  children: React.ReactNode;
  userEmail: string | null;
}) {
  const pathname = usePathname();
  const isSignIn = pathname === "/sign-in";

  if (isSignIn) {
    return <div className={styles.bare}>{children}</div>;
  }

  return (
    <div className={styles.shell}>
      <header className={styles.topbar}>
        <span className={styles.brand}>Farrell Electric</span>
        <div className={styles.topbarRight}>
          {userEmail ? <span className={styles.who}>{userEmail}</span> : null}
          <SignOutButton />
        </div>
      </header>
      <main className={styles.content}>{children}</main>
      <nav className={styles.bottomnav}>
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
    </div>
  );
}
