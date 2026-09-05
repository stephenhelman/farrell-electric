import type { Metadata } from "next";
import { getFinancing } from "@/lib/content";
import { FinancingSection } from "@/components/pages/FinancingSection";
import { buildMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildMetadata({
  title: "Financing",
  description: "Ask about flexible financing options for your outdoor lighting project.",
  path: "/financing",
});

export default function FinancingPage() {
  const financing = getFinancing();

  return <FinancingSection financing={financing} />;
}
