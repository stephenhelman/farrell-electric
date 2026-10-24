"use client";

import { useEffect, useId, useRef, useState } from "react";
import styles from "./ImageInfo.module.css";

/**
 * Small (i) control for image provenance. Opens on hover or keyboard focus via
 * CSS, and on tap via state; closes on outside tap or Escape.
 */
export function ImageInfo({ note }: { note: string }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLSpanElement>(null);
  const noteId = useId();

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <span ref={wrapRef} className={styles.wrap} data-open={open}>
      <button
        type="button"
        className={styles.button}
        aria-label="About this image"
        aria-describedby={noteId}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        i
      </button>
      <span id={noteId} role="tooltip" className={styles.note}>
        {note}
      </span>
    </span>
  );
}
