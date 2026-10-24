import { getSiteSettings } from "@/lib/content";
import { getLicenseNumber } from "@/lib/content/credentials";
import styles from "./LicenseLine.module.css";

/**
 * One-line license credential, read from the content store's credentials.
 * Renders nothing while the license number is blank, so it can be switched
 * off from the studio.
 */
export function LicenseLine({ className }: { className?: string }) {
  const license = getLicenseNumber();
  if (!license) return null;
  const { licenseLabel, licenseVerifyUrl } = getSiteSettings().credentials;

  return (
    <p className={[styles.line, className].filter(Boolean).join(" ")}>
      <span>{licenseLabel}</span>
      <span aria-hidden="true">·</span>
      {licenseVerifyUrl ? (
        <a href={licenseVerifyUrl} target="_blank" rel="noopener noreferrer" aria-label={`License ${license} — verify with the State of Florida (opens in a new tab)`}>
          {license}
        </a>
      ) : (
        <span>{license}</span>
      )}
    </p>
  );
}
