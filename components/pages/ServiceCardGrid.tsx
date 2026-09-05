import type { Service } from "@/lib/content";
import { Section } from "@/components/ui/Section";
import { Card } from "@/components/ui/Card";
import styles from "./ServiceCardGrid.module.css";

export function ServiceCardGrid({
  services,
  surface = "base",
}: {
  services: Service[];
  surface?: "base" | "raised";
}) {
  if (services.length === 0) return null;

  return (
    <Section surface={surface}>
      <div className={styles.grid}>
        {services.map((service) => (
          <Card key={service.id} title={service.name}>
            {service.summary}
          </Card>
        ))}
      </div>
    </Section>
  );
}
