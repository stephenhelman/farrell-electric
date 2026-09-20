import type { Metadata } from "next";
import { getLegalPage } from "@/lib/content";
import { LegalPage } from "@/components/pages/LegalPage";
import { buildMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildMetadata({
  title: "Privacy Policy",
  description: "How Farrell Electric, Inc. collects, uses, and shares your information.",
  path: "/privacy",
});

export default function PrivacyPage() {
  return <LegalPage page={getLegalPage("privacy")} />;
}
