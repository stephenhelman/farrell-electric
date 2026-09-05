import type { Financing } from "@/lib/content";
import { Section } from "@/components/ui/Section";
import { Button } from "@/components/ui/Button";
import styles from "./FinancingSection.module.css";

/**
 * hasTerms gates the terms block. No APRs, "0%", monthly payments, or promo
 * terms exist in content — this component simply renders whatever is (or
 * isn't) there rather than deciding what's allowed.
 */
export function FinancingSection({ financing }: { financing: Financing }) {
  return (
    <Section>
      <div className={styles.wrap}>
        <h1 className={styles.headline}>{financing.headline}</h1>
        <p className={styles.body}>{financing.body}</p>

        {financing.hasTerms && financing.terms ? (
          <p className={styles.terms}>{financing.terms}</p>
        ) : (
          <p className={styles.termsNotice}>
            Specific financing programs and disclosures are not yet available. Contact us to ask about current
            options.
          </p>
        )}

        <Button href={financing.cta.href} variant="primary">
          {financing.cta.label}
        </Button>
      </div>
    </Section>
  );
}
