import Image from "next/image";
import type { HeroSection } from "@/lib/content";
import { Button } from "@/components/ui/Button";
import styles from "./Hero.module.css";

/**
 * Image-first hero. `videoSrc` is accepted but unused in v1 — the brief calls
 * for an eventual cinematic video hero. When that lands, `bgImage` becomes the
 * <video poster> and this component swaps in a <video> element behind the same
 * scrim/content markup, so the section doesn't need restructuring later.
 */
export function Hero({ hero, videoSrc }: { hero: HeroSection; videoSrc?: string }) {
  return (
    <section className={styles.hero}>
      <div className={styles.media}>
        {videoSrc ? (
          <video src={videoSrc} poster={hero.bgImage} autoPlay muted loop playsInline width="100%" height="100%" />
        ) : (
          <Image src={hero.bgImage} alt="" fill priority sizes="100vw" />
        )}
      </div>
      <div className={styles.scrim} />
      <div className={styles.content}>
        <h1 className={styles.headline}>{hero.headline}</h1>
        <p className={styles.subhead}>{hero.subhead}</p>
        <p className={styles.supportingCopy}>{hero.supportingCopy}</p>
        <div className={styles.ctaRow}>
          <Button href={hero.primaryCta.href} variant="primary">
            {hero.primaryCta.label}
          </Button>
          <Button href={hero.secondaryCta.href} variant="secondary">
            {hero.secondaryCta.label}
          </Button>
        </div>
        <p className={styles.trustLine}>{hero.trustLine}</p>
      </div>
    </section>
  );
}
