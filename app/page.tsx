import { getHome, getServicesByIds, getProjects } from "@/lib/content";
import { Hero } from "@/components/home/Hero";
import { DivisionCards } from "@/components/home/DivisionCards";
import { ServiceGridSection } from "@/components/home/ServiceGridSection";
import { PermanentLighting } from "@/components/home/PermanentLighting";
import { BeforeAfterTeaser } from "@/components/home/BeforeAfterTeaser";
import { WhyFarrell } from "@/components/home/WhyFarrell";
import { FinalCta } from "@/components/home/FinalCta";

export default function Home() {
  const home = getHome();
  const beforeAfterPair = getProjects({ category: "before-after" })[0];

  return (
    <>
      <Hero hero={home.hero} />
      <DivisionCards cards={home.divisionCards} />
      <ServiceGridSection
        headline={home.landscapeOverview.headline}
        body={home.landscapeOverview.body}
        services={getServicesByIds(home.landscapeOverview.serviceIds)}
        cta={home.landscapeOverview.cta}
        ctaVariant="primary"
        surface="base"
      />
      <PermanentLighting section={home.permanentLighting} />
      <BeforeAfterTeaser teaser={home.beforeAfterTeaser} pair={beforeAfterPair} />
      <WhyFarrell section={home.whyFarrell} />
      <ServiceGridSection
        headline={home.electricalIntro.headline}
        body={home.electricalIntro.body}
        services={getServicesByIds(home.electricalIntro.serviceIds)}
        cta={home.electricalIntro.cta}
        ctaVariant="outline"
        surface="raised"
      />
      <FinalCta section={home.finalCta} />
    </>
  );
}
