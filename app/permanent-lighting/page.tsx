import type { Metadata } from "next";
import { getPage } from "@/lib/content";
import { TagsIntro } from "@/components/pages/TagsIntro";
import { buildMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildMetadata({
  title: "Permanent Lighting",
  description:
    "Professionally installed permanent exterior lighting for holidays, special occasions and year-round architectural lighting in South Florida.",
  path: "/permanent-lighting",
});

export default function PermanentLightingPage() {
  const page = getPage("permanent-lighting");

  return <TagsIntro headline={page.headline} body={page.body} tags={page.tags} cta={page.cta} />;
}
