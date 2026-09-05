import Image from "next/image";
import type { BeforeAfterTeaserSection, Project } from "@/lib/content";
import { Section } from "@/components/ui/Section";
import { Button } from "@/components/ui/Button";
import styles from "./BeforeAfterTeaser.module.css";

/**
 * Static teaser only — the interactive slider ships in the Our Work gallery (Task 5).
 * `pair` is expected to be a project with beforeImage/afterImage set; caption always
 * reflects isRealProject so a placeholder pair is never implied to be a real job.
 */
export function BeforeAfterTeaser({
  teaser,
  pair,
}: {
  teaser: BeforeAfterTeaserSection;
  pair: Project | undefined;
}) {
  return (
    <Section surface="base">
      <h2 className={styles.headline}>{teaser.headline}</h2>

      {pair && pair.beforeImage && pair.afterImage && (
        <>
          <div className={styles.pair}>
            <div className={styles.frame}>
              <Image src={pair.beforeImage} alt="" fill sizes="(max-width: 768px) 50vw, 25vw" />
              <span className={styles.label}>{teaser.beforeLabel}</span>
            </div>
            <div className={styles.frame}>
              <Image src={pair.afterImage} alt="" fill sizes="(max-width: 768px) 50vw, 25vw" />
              <span className={styles.label}>{teaser.afterLabel}</span>
            </div>
          </div>
          {!pair.isRealProject && <p className={styles.caption}>{pair.caption}</p>}
        </>
      )}

      <Button href={teaser.cta.href} variant="secondary">
        {teaser.cta.label}
      </Button>
    </Section>
  );
}
