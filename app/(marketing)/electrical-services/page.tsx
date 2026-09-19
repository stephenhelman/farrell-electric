import type { Metadata } from "next";
import { getPage, getServices, getSiteSettings } from "@/lib/content";
import { PageIntro } from "@/components/pages/PageIntro";
import { SectionLabelList } from "@/components/pages/SectionLabelList";
import { JsonLd } from "@/components/seo/JsonLd";
import { buildServiceJsonLd } from "@/lib/seo/jsonld";
import { buildMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildMetadata({
  title: "Electrical Services",
  description:
    "Residential and commercial electrical services throughout Broward and Palm Beach County since 1993.",
  path: "/electrical-services",
});

export default function ElectricalServicesPage() {
  const page = getPage("electrical-services");
  const services = [...getServices({ category: "electrical" }), ...getServices({ category: "commercial" })];
  const settings = getSiteSettings();

  return (
    <>
      <JsonLd data={services.map((service) => buildServiceJsonLd(service, settings))} />
      <PageIntro headline={page.headline} body={page.body} cta={page.cta} />
      <SectionLabelList labels={page.sectionLabels} surface="raised" />
    </>
  );
}
