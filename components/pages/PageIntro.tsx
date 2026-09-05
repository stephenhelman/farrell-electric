import type { Cta } from "@/lib/content";
import { Section } from "@/components/ui/Section";
import { Button } from "@/components/ui/Button";
import styles from "./PageIntro.module.css";

export function PageIntro({
  headline,
  body,
  cta,
  secondaryCta,
  surface = "base",
}: {
  headline: string;
  body: string[];
  cta?: Cta | null;
  secondaryCta?: Cta | null;
  surface?: "base" | "raised";
}) {
  return (
    <Section surface={surface}>
      <div className={styles.wrap}>
        <h1 className={styles.headline}>{headline}</h1>
        <div className={styles.body}>
          {body.map((paragraph, index) => (
            <p key={index}>{paragraph}</p>
          ))}
        </div>
        {(cta || secondaryCta) && (
          <div className={styles.ctaRow}>
            {cta && (
              <Button href={cta.href} variant="primary">
                {cta.label}
              </Button>
            )}
            {secondaryCta && (
              <Button href={secondaryCta.href} variant="secondary">
                {secondaryCta.label}
              </Button>
            )}
          </div>
        )}
      </div>
    </Section>
  );
}
