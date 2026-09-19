import type { Metadata } from "next";
import { getPage } from "@/lib/content";
import { PageIntro } from "@/components/pages/PageIntro";
import { buildMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildMetadata({
  title: "About Us",
  description: "Farrell Electric, Inc. has served South Florida since 1993.",
  path: "/about",
});

export default function AboutPage() {
  const page = getPage("about");

  return <PageIntro headline={page.headline} body={page.body} />;
}
