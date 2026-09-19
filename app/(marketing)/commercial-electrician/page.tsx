import type { Metadata } from "next";
import { getPage, getServicesByIds, getSiteSettings } from "@/lib/content";
import { PageIntro } from "@/components/pages/PageIntro";
import { SectionLabelList } from "@/components/pages/SectionLabelList";
import { ServiceCardGrid } from "@/components/pages/ServiceCardGrid";
import { JsonLd } from "@/components/seo/JsonLd";
import { buildServiceJsonLd } from "@/lib/seo/jsonld";
import { buildMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildMetadata({
  title: "Commercial Electrician",
  description:
    "Electrical service for businesses, commercial properties, contractors and property managers throughout South Florida.",
  path: "/commercial-electrician",
});

export default function CommercialElectricianPage() {
  const page = getPage("commercial-electrician");
  const services = getServicesByIds(page.serviceIds);
  const settings = getSiteSettings();

  return (
    <>
      <JsonLd data={services.map((service) => buildServiceJsonLd(service, settings))} />
      <PageIntro headline={page.headline} body={page.body} cta={page.cta} />
      <SectionLabelList labels={page.sectionLabels} surface="raised" />
      <ServiceCardGrid services={services} surface="base" />
    </>
  );
}
