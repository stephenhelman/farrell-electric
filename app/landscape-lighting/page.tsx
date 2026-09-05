import type { Metadata } from "next";
import { getPage, getServicesByIds, getSiteSettings } from "@/lib/content";
import { PageIntro } from "@/components/pages/PageIntro";
import { ServiceCardGrid } from "@/components/pages/ServiceCardGrid";
import { ProcessSteps } from "@/components/pages/ProcessSteps";
import { JsonLd } from "@/components/seo/JsonLd";
import { buildServiceJsonLd } from "@/lib/seo/jsonld";
import { buildMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildMetadata({
  title: "Landscape Lighting",
  description:
    "Custom landscape lighting design for architecture, palms, pathways, pools and outdoor living spaces in Broward and Palm Beach County.",
  path: "/landscape-lighting",
});

export default function LandscapeLightingPage() {
  const page = getPage("landscape-lighting");
  const services = getServicesByIds(page.serviceIds);
  const settings = getSiteSettings();

  return (
    <>
      <JsonLd data={services.map((service) => buildServiceJsonLd(service, settings))} />
      <PageIntro headline={page.headline} body={page.body} cta={page.cta} />
      <ServiceCardGrid services={services} surface="raised" />
      {page.process && page.processHeadline && (
        <ProcessSteps headline={page.processHeadline} steps={page.process} cta={page.secondaryCta} />
      )}
    </>
  );
}
