import { getSiteSettings } from "./index";
import type { TrustBadge } from "./types";

const LICENSE_TOKEN = "{license}";

/** Trimmed license number, or null when blank — the single on/off switch for every license mention. */
export function getLicenseNumber(): string | null {
  return getSiteSettings().credentials.licenseNumber.trim() || null;
}

/** Fills `{license}` in editable copy; a blank license drops the token and its adjacent separator. */
export function expandLicenseToken(text: string): string {
  const license = getLicenseNumber();
  if (license) return text.split(LICENSE_TOKEN).join(license);
  return text
    .replace(/\s*[•·|-]\s*\{license\}/g, "")
    .replace(/\{license\}\s*[•·|-]\s*/g, "")
    .replace(LICENSE_TOKEN, "")
    .trim();
}

export function getVisibleBadges(): { id: string; label: string; detail: string }[] {
  const license = getLicenseNumber();
  return getSiteSettings()
    .credentials.badges.filter((badge: TrustBadge) => badge.label.trim() && (license || !badge.detail.includes(LICENSE_TOKEN)))
    .map((badge: TrustBadge) => ({ id: badge.id, label: badge.label, detail: expandLicenseToken(badge.detail) }));
}
