import type { WhyFarrellSection } from "@/lib/content";
import { Section } from "@/components/ui/Section";
import { Card } from "@/components/ui/Card";
import { Reveal } from "@/components/motion/Reveal";
import styles from "./WhyFarrell.module.css";

export function WhyFarrell({ section }: { section: WhyFarrellSection }) {
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

      <div className={styles.grid}>
        {section.cards.map((card, index) => (
          <Reveal key={card.id} delayMs={index * 80}>
            <Card title={card.title}>{card.body}</Card>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
