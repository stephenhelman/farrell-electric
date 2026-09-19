import type { RepoOption } from "@/lib/app/repo/types";
import type { EstimatorSelection } from "./expand-options";

export interface AutoSizingResult {
  totalWattage: number;
  totalLinearFeet: number;
  /** TODO(owner): transformer-sizing rule (wattage → transformer size/tap). */
  transformerNote: string;
  /** TODO(owner): wire-gauge/footage rule (linear ft + wattage → wire spec). */
  wireNote: string;
  /** TODO(owner): labor-scaling rule (fixture/footage counts → crew hours). */
  laborNote: string;
}

/**
 * STUBBED SEAM — do not implement transformer sizing, wire footage, or labor
 * scaling math here. This function only aggregates the real inputs the
 * guided form already has (summed wattage, summed linear feet) and reports
 * them back with a placeholder note; it never adds a transformer, wire, or
 * labor line item to the quote on its own. Swap the three *Note strings for
 * real calculations once the owner provides the sizing rules.
 */
export function estimateAutoSizing(selections: EstimatorSelection[], options: RepoOption[]): AutoSizingResult {
  let totalWattage = 0;
  let totalLinearFeet = 0;

  for (const selection of selections) {
    if (selection.value <= 0) continue;
    const option = options.find((candidate) => candidate.id === selection.optionId);
    if (!option) continue;

    if (option.inputType === "LINEAR_FT") {
      totalLinearFeet += selection.value;
    }

    for (const component of option.components) {
      if (component.catalogItemWattage === null) continue;
      totalWattage += selection.value * component.qtyPerUnit * component.catalogItemWattage;
    }
  }

  return {
    totalWattage,
    totalLinearFeet,
    transformerNote: `TODO(owner): transformer-sizing rule not yet provided. Connected load from this estimate: ${totalWattage}W.`,
    wireNote: `TODO(owner): wire-gauge/footage rule not yet provided. Linear feet entered: ${totalLinearFeet}ft.`,
    laborNote: "TODO(owner): labor-scaling rule not yet provided.",
  };
}
