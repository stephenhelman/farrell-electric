import type { Metadata } from "next";
import { Section } from "@/components/ui/Section";
import { ContactForm } from "@/components/contact/ContactForm";
import type { LeadIntent } from "@/lib/leads/types";
import { buildMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildMetadata({
  title: "Contact",
  description: "Tell us about your lighting or electrical project and we'll be in touch.",
  path: "/contact",
});

const VALID_INTENTS: LeadIntent[] = ["landscape-lighting", "permanent-lighting", "electrical", "commercial"];

function parseIntent(value: string | undefined): LeadIntent | null {
  return VALID_INTENTS.includes(value as LeadIntent) ? (value as LeadIntent) : null;
}

export default async function ContactPage({
  searchParams,
}: {
  searchParams: Promise<{ intent?: string }>;
}) {
  const params = await searchParams;
  const initialIntent = parseIntent(params.intent);

  return (
    <Section>
      <ContactForm initialIntent={initialIntent} />
    </Section>
  );
}
