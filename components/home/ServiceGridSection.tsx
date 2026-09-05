import type { Cta, Service } from "@/lib/content";
import { Section } from "@/components/ui/Section";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import styles from "./ServiceGridSection.module.css";

export function ServiceGridSection({
  headline,
  body,
  services,
  cta,
  ctaVariant = "primary",
  surface = "base",
}: {
  headline: string;
  body: string[];
  services: Service[];
  cta: Cta;
  ctaVariant?: "primary" | "secondary" | "outline";
  surface?: "base" | "raised";
}) {
  return (
    <Section surface={surface}>
      <div className={styles.header}>
        <h2 className={styles.headline}>{headline}</h2>
        <div className={styles.body}>
          {body.map((paragraph, index) => (
            <p key={index}>{paragraph}</p>
          ))}
        </div>
      </div>

      <div className={styles.grid}>
        {services.map((service) => (
          <Card key={service.id} title={service.name}>
            {service.summary}
          </Card>
        ))}
      </div>

      <Button href={cta.href} variant={ctaVariant}>
        {cta.label}
      </Button>
    </Section>
  );
}
