import Image from "next/image";
import type { FinalCtaSection } from "@/lib/content";
import { Button } from "@/components/ui/Button";
import styles from "./FinalCta.module.css";

export function FinalCta({ section }: { section: FinalCtaSection }) {
  return (
    <section className={styles.section}>
      <div className={styles.media}>
        <Image src={section.bgImage} alt="" fill sizes="100vw" />
      </div>
      <div className={styles.scrim} />
      <div className={styles.content}>
        <h2 className={styles.headline}>{section.headline}</h2>
        <p className={styles.body}>{section.body}</p>
        <div className={styles.ctaRow}>
          <Button href={section.primaryCta.href} variant="primary">
            {section.primaryCta.label}
          </Button>
          <Button href={section.secondaryCta.href} variant="secondary">
            {section.secondaryCta.label}
          </Button>
        </div>
        <p className={styles.electricalPrompt}>{section.electricalPrompt}</p>
        <Button href={section.electricalCta.href} variant="outline">
          {section.electricalCta.label}
        </Button>
      </div>
    </section>
  );
}
