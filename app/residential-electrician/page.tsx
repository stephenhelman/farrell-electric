import type { Metadata } from "next";
import { getPage, getServicesByIds, getSiteSettings } from "@/lib/content";
import { PageIntro } from "@/components/pages/PageIntro";
import { ServiceCardGrid } from "@/components/pages/ServiceCardGrid";
import { JsonLd } from "@/components/seo/JsonLd";
import { buildServiceJsonLd } from "@/lib/seo/jsonld";
import { buildMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildMetadata({
  title: "Residential Electrician",
  description: "Electrical services for homes, renovations and property improvements in South Florida.",
  path: "/residential-electrician",
});

export default function ResidentialElectricianPage() {
  const page = getPage("residential-electrician");
  const services = getServicesByIds(page.serviceIds);
  const settings = getSiteSettings();

  return (
    <>
      <JsonLd data={services.map((service) => buildServiceJsonLd(service, settings))} />
      <PageIntro headline={page.headline} body={page.body} cta={page.cta} />
      <ServiceCardGrid services={services} surface="raised" />
    </>
  );
}
