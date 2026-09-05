import Image from "next/image";
import type { DivisionCard } from "@/lib/content";
import { Section } from "@/components/ui/Section";
import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/motion/Reveal";
import styles from "./DivisionCards.module.css";

export function DivisionCards({ cards }: { cards: DivisionCard[] }) {
  return (
    <Section surface="base">
      <div className={styles.grid}>
        {cards.map((card, index) => (
          <Reveal key={card.id} delayMs={index * 100}>
            <div className={styles.card}>
              <Image src={card.image} alt="" fill sizes="(max-width: 768px) 100vw, 50vw" className={styles.image} />
              <div className={styles.scrim} />
              <div className={styles.content}>
                <h2 className={styles.title}>{card.title}</h2>
                <p className={styles.body}>{card.body}</p>
                <Button href={card.cta.href} variant="primary">
                  {card.cta.label}
                </Button>
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
