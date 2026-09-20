import type { Metadata } from "next";
import { getLegalPage } from "@/lib/content";
import { LegalPage } from "@/components/pages/LegalPage";
import { buildMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildMetadata({
  title: "SMS Terms",
  description: "Farrell Electric, Inc. SMS program terms.",
  path: "/sms-terms",
});

export default function SmsTermsPage() {
  return <LegalPage page={getLegalPage("sms-terms")} />;
}
