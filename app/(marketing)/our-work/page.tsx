import type { Metadata } from "next";
import { getProjects } from "@/lib/content";
import { PageIntro } from "@/components/pages/PageIntro";
import { Section } from "@/components/ui/Section";
import { Gallery } from "@/components/gallery/Gallery";
import { buildMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildMetadata({
  title: "Our Work",
  description: "See how professional lighting can completely transform a property after sunset.",
  path: "/our-work",
});

export default function OurWorkPage() {
  const projects = getProjects();

  return (
    <>
      <PageIntro
        headline="OUR WORK"
        body={["See how professional lighting can completely transform a property after sunset."]}
      />
      <Section surface="raised">
        <Gallery projects={projects} />
      </Section>
    </>
  );
}
