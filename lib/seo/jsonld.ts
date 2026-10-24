import type { Service, SiteSettings } from "@/lib/content";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.farrellelectric.com";

/**
 * Electrician/LocalBusiness entity. areaServed is hard-limited to the two
 * confirmed counties — never expand this without a confirmed service area.
 */
export function buildLocalBusinessJsonLd(settings: SiteSettings) {
  const license = settings.credentials.licenseNumber.trim();
  return {
    "@context": "https://schema.org",
    "@type": "Electrician",
    name: "Farrell Electric, Inc.",
    url: SITE_URL,
    telephone: settings.phone,
    email: settings.email,
    foundingDate: "1993",
    ...(license && {
      identifier: license,
      hasCredential: {
        "@type": "EducationalOccupationalCredential",
        credentialCategory: "license",
        name: `Florida Electrical Contractor License ${license}`,
        recognizedBy: { "@type": "GovernmentOrganization", name: "Florida Department of Business and Professional Regulation" },
      },
    }),
    areaServed: [
      { "@type": "AdministrativeArea", name: "Broward County, FL" },
      { "@type": "AdministrativeArea", name: "Palm Beach County, FL" },
    ],
    address: {
      "@type": "PostalAddress",
      addressRegion: "FL",
      addressCountry: "US",
    },
  };
}

export function buildServiceJsonLd(service: Service, settings: SiteSettings) {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    serviceType: service.name,
    description: service.summary,
    provider: {
      "@type": "Electrician",
      name: "Farrell Electric, Inc.",
      telephone: settings.phone,
    },
    areaServed: [
      { "@type": "AdministrativeArea", name: "Broward County, FL" },
      { "@type": "AdministrativeArea", name: "Palm Beach County, FL" },
    ],
  };
}
