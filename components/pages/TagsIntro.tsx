import type { Cta } from "@/lib/content";
import { Section } from "@/components/ui/Section";
import { Button } from "@/components/ui/Button";
import styles from "@/components/home/PermanentLighting.module.css";

export function TagsIntro({
  headline,
  body,
  tags,
  cta,
  surface = "base",
}: {
  headline: string;
  body: string[];
  tags: string[];
  cta?: Cta | null;
  surface?: "base" | "raised";
}) {
  return (
    <Section surface={surface}>
      <div className={styles.header}>
        <h1 className={styles.headline}>{headline}</h1>
        <div className={styles.body}>
          {body.map((paragraph, index) => (
            <p key={index}>{paragraph}</p>
          ))}
        </div>
      </div>

      {tags.length > 0 && (
        <div className={styles.tags}>
          {tags.map((tag) => (
            <span key={tag} className={styles.tag}>
              {tag}
            </span>
          ))}
        </div>
      )}

      {cta && (
        <Button href={cta.href} variant="primary">
          {cta.label}
        </Button>
      )}
    </Section>
  );
}
