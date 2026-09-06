"use client";

import { useRef } from "react";
import type { Cta } from "@/lib/content";
import { Button } from "@/components/ui/Button";
import { SubmitButton } from "@/components/ui/SubmitButton";
import styles from "./HeaderCtaModal.module.css";

/**
 * Consolidates the header's two CTAs into one trigger + a native <dialog>
 * modal offering both choices. Frees up header width for the nav links
 * without dropping either CTA — native <dialog> gives Escape-to-close and
 * backdrop click-to-close for free, no new dependency.
 */
export function HeaderCtaModal({ primaryCta, secondaryCta }: { primaryCta: Cta; secondaryCta: Cta }) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  return (
    <>
      <SubmitButton
        type="button"
        variant="primary"
        className={styles.trigger}
        onClick={() => dialogRef.current?.showModal()}
      >
        GET STARTED
      </SubmitButton>

      <dialog ref={dialogRef} className={styles.dialog} aria-labelledby="header-cta-headline">
        <div className={styles.inner}>
          <button
            type="button"
            className={styles.closeButton}
            aria-label="Close"
            onClick={() => dialogRef.current?.close()}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M2 2l12 12M14 2L2 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>

          <h2 id="header-cta-headline" className={styles.headline}>
            What can we help you with?
          </h2>

          <div className={styles.optionList}>
            <Button href={primaryCta.href} variant="primary" fullWidth onClick={() => dialogRef.current?.close()}>
              {primaryCta.label}
            </Button>
            <Button href={secondaryCta.href} variant="secondary" fullWidth onClick={() => dialogRef.current?.close()}>
              {secondaryCta.label}
            </Button>
          </div>
        </div>
      </dialog>
    </>
  );
}
