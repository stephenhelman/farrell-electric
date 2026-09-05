import Image from "next/image";
import type { HTMLAttributes, ReactNode } from "react";
import styles from "./Card.module.css";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  title?: string;
  image?: string;
  imageAlt?: string;
  children?: ReactNode;
}

export function Card({ title, image, imageAlt, className, children, ...rest }: CardProps) {
  const classes = [styles.card, image ? styles.mediaCard : "", className].filter(Boolean).join(" ");

  return (
    <div className={classes} {...rest}>
      {image && (
        <div className={styles.imageWrap}>
          <Image src={image} alt={imageAlt ?? title ?? ""} fill sizes="(max-width: 768px) 100vw, 33vw" style={{ objectFit: "cover" }} />
        </div>
      )}
      <div className={styles.padded}>
        {title && <h3 className={styles.title}>{title}</h3>}
        {children && <div className={styles.body}>{children}</div>}
      </div>
    </div>
  );
}
