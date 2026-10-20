"use client";

import { useRef, useState } from "react";
import styles from "./RenderGallery.module.css";

/** Customer-facing render grid; tap an image to enlarge it in a dialog. Receives URLs only. */
export function RenderGallery({ urls }: { urls: string[] }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [active, setActive] = useState(0);

  function open(index: number) {
    setActive(index);
    dialogRef.current?.showModal();
  }

  return (
    <section className={styles.section} aria-label="Renders">
      <h2 className={styles.heading}>Renders</h2>
      <ul className={styles.grid}>
        {urls.map((url, i) => (
          <li key={url}>
            <button type="button" className={styles.tile} onClick={() => open(i)} aria-label={`Enlarge render ${i + 1}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt={`Render ${i + 1}`} className={styles.img} loading="lazy" />
            </button>
          </li>
        ))}
      </ul>

      <dialog
        ref={dialogRef}
        className={styles.dialog}
        aria-label="Enlarged render"
        onClick={(e) => {
          if (e.target === dialogRef.current) dialogRef.current?.close();
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={urls[active]} alt={`Render ${active + 1}`} className={styles.full} />
        <button type="button" className={styles.close} onClick={() => dialogRef.current?.close()}>
          Close
        </button>
      </dialog>
    </section>
  );
}
