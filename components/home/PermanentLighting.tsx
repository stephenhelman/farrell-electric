import type { PermanentLightingSection as PermanentLightingSectionType } from "@/lib/content";
import { Section } from "@/components/ui/Section";
import { Button } from "@/components/ui/Button";
import styles from "./PermanentLighting.module.css";

export function PermanentLighting({ section }: { section: PermanentLightingSectionType }) {
  return (
    <Section surface="raised">
      <div className={styles.header}>
        <h2 className={styles.headline}>{section.headline}</h2>
        <div className={styles.body}>
          {section.body.map((paragraph, index) => (
            <p key={index}>{paragraph}</p>
          ))}
        </div>
      </div>

      <div className={styles.tags}>
        {section.useCaseTags.map((tag) => (
          <span key={tag} className={styles.tag}>
            {tag}
          </span>
        ))}
      </div>

      <Button href={section.cta.href} variant="primary">
        {section.cta.label}
      </Button>
    </Section>
  );
}
