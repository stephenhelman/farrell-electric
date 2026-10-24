import { getVisibleBadges } from "@/lib/content/credentials";
import { Section } from "@/components/ui/Section";
import styles from "./TrustBadgeStrip.module.css";

/** Home-page trust row. Badges come from the content store; renders nothing when none are visible. */
export function TrustBadgeStrip() {
  const badges = getVisibleBadges();
  if (badges.length === 0) return null;

  return (
    <Section surface="raised" aria-label="Credentials" className={styles.section}>
      <ul className={styles.list}>
        {badges.map((badge) => (
          <li key={badge.id} className={styles.badge}>
            <svg className={styles.icon} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path d="M12 2 4 5v6c0 5 3.4 9.4 8 11 4.6-1.6 8-6 8-11V5l-8-3Zm-1.2 14.2-3.5-3.5 1.4-1.4 2.1 2.1 4.6-4.6 1.4 1.4-6 6Z" fill="currentColor" />
            </svg>
            <span className={styles.text}>
              <span className={styles.label}>{badge.label}</span>
              <span className={styles.detail}>{badge.detail}</span>
            </span>
          </li>
        ))}
      </ul>
    </Section>
  );
}
