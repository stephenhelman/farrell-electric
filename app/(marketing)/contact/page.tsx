import type { Metadata } from "next";
import { Section } from "@/components/ui/Section";
import { ContactForm } from "@/components/contact/ContactForm";
import type { LeadIntent } from "@/lib/leads/types";
import { buildMetadata } from "@/lib/seo/metadata";
import { getSiteSettings } from "@/lib/content";
import styles from "./page.module.css";

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
  const { phone, cellPhone, email } = getSiteSettings();

  return (
    <Section>
      <div className={styles.phoneLines}>
        <a href={`tel:${phone.replace(/[^\d+]/g, "")}`}>Office: {phone}</a>
        <a href={`tel:${cellPhone.replace(/[^\d+]/g, "")}`}>Direct: {cellPhone}</a>
        <a href={`mailto:${email}`}>{email}</a>
      </div>
      <ContactForm initialIntent={initialIntent} />
    </Section>
  );
}
