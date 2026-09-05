import type { Metadata } from "next";
import { getPage, getHome, getServicesByIds, getSiteSettings } from "@/lib/content";
import { PageIntro } from "@/components/pages/PageIntro";
import { DivisionCards } from "@/components/home/DivisionCards";
import { ServiceCardGrid } from "@/components/pages/ServiceCardGrid";
import { JsonLd } from "@/components/seo/JsonLd";
import { buildServiceJsonLd } from "@/lib/seo/jsonld";
import { buildMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildMetadata({
  title: "Outdoor Lighting",
  description:
    "Premium outdoor lighting — landscape and permanent lighting divisions — backed by electrical experience since 1993. Serving Broward and Palm Beach County.",
  path: "/outdoor-lighting",
});

export default function OutdoorLightingPage() {
  const page = getPage("outdoor-lighting");
  const { divisionCards } = getHome();
  const services = getServicesByIds(page.serviceIds);
  const settings = getSiteSettings();

  return (
    <>
      <JsonLd data={services.map((service) => buildServiceJsonLd(service, settings))} />
      <PageIntro headline={page.headline} body={page.body} />
      <DivisionCards cards={divisionCards} />
      <ServiceCardGrid services={services} surface="raised" />
    </>
  );
}
