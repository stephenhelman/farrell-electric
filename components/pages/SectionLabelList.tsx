import { Section } from "@/components/ui/Section";
import styles from "./SectionLabelList.module.css";

/**
 * Flat capability labels the brief gives without a dedicated descriptive
 * sentence per item. Rendered as-is — no invented summary copy per label.
 * Layout stays ready for verified detail/specifics to be dropped in later.
 */
export function SectionLabelList({
  labels,
  surface = "base",
}: {
  labels: string[];
  surface?: "base" | "raised";
}) {
  if (labels.length === 0) return null;

  return (
    <Section surface={surface}>
      <div className={styles.grid}>
        {labels.map((label) => (
          <div key={label} className={styles.item}>
            {label}
          </div>
        ))}
      </div>
    </Section>
  );
}
