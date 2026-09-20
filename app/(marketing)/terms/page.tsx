import type { Metadata } from "next";
import { getLegalPage } from "@/lib/content";
import { LegalPage } from "@/components/pages/LegalPage";
import { buildMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildMetadata({
  title: "Terms & Conditions",
  description: "The terms and conditions governing use of the Farrell Electric, Inc. website.",
  path: "/terms",
});

export default function TermsPage() {
  return <LegalPage page={getLegalPage("terms")} />;
}
