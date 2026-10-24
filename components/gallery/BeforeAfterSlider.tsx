"use client";

import { useState } from "react";
import Image from "next/image";
import styles from "./BeforeAfterSlider.module.css";

export function BeforeAfterSlider({
  beforeImage,
  afterImage,
  beforeLabel = "Before",
  afterLabel = "After",
}: {
  beforeImage: string;
  afterImage: string;
  beforeLabel?: string;
  afterLabel?: string;
}) {
  const [position, setPosition] = useState(50);

  return (
    <div className={styles.frame}>
      <Image src={afterImage} alt="" fill sizes="(max-width: 768px) 100vw, 33vw" />
      <span className={`${styles.label} ${styles.labelAfter}`}>{afterLabel}</span>
      <div className={styles.beforeLayer} style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}>
        <Image src={beforeImage} alt="" fill sizes="(max-width: 768px) 100vw, 33vw" />
        <span className={`${styles.label} ${styles.labelBefore}`}>{beforeLabel}</span>
      </div>
      <div className={styles.divider} style={{ left: `${position}%` }} />
      <div className={styles.handle} style={{ left: `${position}%` }} aria-hidden="true">
        ↔
      </div>
      <input
        type="range"
        min={0}
        max={100}
        step={0.1}
        value={position}
        onChange={(event) => setPosition(Number(event.target.value))}
        className={styles.range}
        aria-label="Reveal before and after"
      />
    </div>
  );
}
