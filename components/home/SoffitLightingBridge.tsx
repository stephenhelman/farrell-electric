import Image from "next/image";
import type { SoffitLightingBridgeSection } from "@/lib/content";
import { Section } from "@/components/ui/Section";
import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/motion/Reveal";
import styles from "./SoffitLightingBridge.module.css";

/**
 * A bridge offering, not a third hero division: line-voltage electrical work
 * surfaced with the same outdoor-lighting visual treatment as the division
 * cards above it, but as a single slim banner rather than a co-equal tile.
 */
export function SoffitLightingBridge({ section }: { section: SoffitLightingBridgeSection }) {
  return (
    <Section surface="base">
      <Reveal>
        <div className={styles.banner}>
          <Image src={section.image} alt="" fill sizes="100vw" className={styles.image} />
          <div className={styles.scrim} />
          <div className={styles.content}>
            <p className={styles.eyebrow}>Electrical Exterior Lighting</p>
            <h2 className={styles.title}>{section.headline}</h2>
            <p className={styles.body}>{section.body}</p>
            <Button href={section.cta.href} variant="secondary">
              {section.cta.label}
            </Button>
          </div>
        </div>
      </Reveal>
    </Section>
  );
}
