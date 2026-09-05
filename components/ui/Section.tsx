import type { ElementType, HTMLAttributes } from "react";
import styles from "./Section.module.css";

export interface SectionProps extends HTMLAttributes<HTMLElement> {
  as?: ElementType;
  surface?: "base" | "raised";
}

const surfaceClass = {
  base: styles.surfaceBase,
  raised: styles.surfaceRaised,
} as const;

export function Section({
  as: Tag = "section",
  surface = "base",
  className,
  children,
  ...rest
}: SectionProps) {
  const classes = [styles.section, surfaceClass[surface], className].filter(Boolean).join(" ");

  return (
    <Tag className={classes} {...rest}>
      <div className={styles.inner}>{children}</div>
    </Tag>
  );
}
