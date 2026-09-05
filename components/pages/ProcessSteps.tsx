import type { Cta, ProcessStep } from "@/lib/content";
import { Section } from "@/components/ui/Section";
import { Button } from "@/components/ui/Button";
import styles from "./ProcessSteps.module.css";

export function ProcessSteps({
  headline,
  steps,
  cta,
  surface = "raised",
}: {
  headline: string;
  steps: ProcessStep[];
  cta?: Cta | null;
  surface?: "base" | "raised";
}) {
  return (
    <Section surface={surface}>
      <h2 className={styles.headline}>{headline}</h2>
      <div className={styles.list}>
        {steps.map((step) => (
          <div key={step.step} className={styles.step}>
            <span className={styles.stepNumber}>{String(step.step).padStart(2, "0")}</span>
            <h3 className={styles.stepTitle}>{step.title}</h3>
            <p className={styles.stepBody}>{step.body}</p>
          </div>
        ))}
      </div>
      {cta && (
        <Button href={cta.href} variant="primary">
          {cta.label}
        </Button>
      )}
    </Section>
  );
}
