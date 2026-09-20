import type { LegalPage as LegalPageContent } from "@/lib/content";
import { Section } from "@/components/ui/Section";
import styles from "./LegalPage.module.css";

export function LegalPage({ page }: { page: LegalPageContent }) {
  return (
    <Section>
      <div className={styles.wrap}>
        <h1 className={styles.headline}>{page.title}</h1>
        <p className={styles.effectiveDate}>Effective Date: {page.effectiveDate}</p>

        {page.intro.map((paragraph, index) => (
          <p key={`intro-${index}`} className={styles.intro}>
            {paragraph}
          </p>
        ))}

        {page.sections.map((section, index) => (
          <div key={index} className={styles.section}>
            {section.heading && <h2 className={styles.sectionHeading}>{section.heading}</h2>}
            {section.body.map((paragraph, paragraphIndex) => (
              <p key={paragraphIndex} className={styles.paragraph}>
                {paragraph}
              </p>
            ))}
          </div>
        ))}
      </div>
    </Section>
  );
}
