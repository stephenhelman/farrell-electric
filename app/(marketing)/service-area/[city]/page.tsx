import type { Metadata } from "next";
import { getSiteSettings } from "@/lib/content";
import { PageIntro } from "@/components/pages/PageIntro";

/**
 * Template route for future city-specific SEO pages. No cities are confirmed
 * yet, so this never asserts service to the requested slug specifically —
 * only the two confirmed counties from siteSettings. Left unpopulated on
 * purpose; a later city content doc replaces this generic render.
 */
function formatCityName(slug: string): string {
  return slug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export async function generateStaticParams() {
  return [];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ city: string }>;
}): Promise<Metadata> {
  const { city } = await params;
  return {
    title: formatCityName(city),
    description: "Farrell Electric proudly serves Broward County and Palm Beach County.",
    alternates: {
      canonical: `/service-area/${city}`,
    },
    // Generic template until a real city doc exists — kept out of the index
    // so it doesn't compete as thin/duplicate content across every slug.
    robots: { index: false, follow: true },
  };
}

export default async function ServiceAreaCityPage({ params }: { params: Promise<{ city: string }> }) {
  const { city } = await params;
  const { serviceAreaLine } = getSiteSettings();
  const cityName = formatCityName(city);

  return (
    <PageIntro
      headline="PROUDLY SERVING SOUTH FLORIDA."
      body={[
        serviceAreaLine + ".",
        `Detailed information for ${cityName} is coming soon. Contact us to confirm availability at your address.`,
      ]}
    />
  );
}
