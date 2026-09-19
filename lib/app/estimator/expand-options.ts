import type { RepoOption } from "@/lib/app/repo/types";

export interface EstimatorLineItem {
  catalogItemId: string | null;
  name: string;
  description: string | null;
  qty: number;
  unitPrice: number;
  cost: number;
  taxable: boolean;
}

/** One guided-form answer: how many units of this option the owner entered.
 * COUNT/LINEAR_FT carry the raw number; BOOLEAN is 1 (include) or 0 (skip). */
export interface EstimatorSelection {
  optionId: string;
  value: number;
}

/**
 * Expands guided-estimator selections into quote line items using only real
 * pricing data — each option's component catalog atoms carry their own
 * price/cost, so a selection of qty N becomes N × qtyPerUnit of each atom at
 * its actual catalog price. No option-level math is invented here.
 *
 * When an option's defaultUnitPrice is eventually set (owner-provided
 * package pricing), that option collapses to a single line priced at
 * defaultUnitPrice instead of one line per component atom — the seam is
 * ready, it's just unused while every seed option leaves it null.
 */
export function expandSelectionsToLineItems(
  selections: EstimatorSelection[],
  options: RepoOption[],
): EstimatorLineItem[] {
  const lines: EstimatorLineItem[] = [];

  for (const selection of selections) {
    if (selection.value <= 0) continue;
    const option = options.find((candidate) => candidate.id === selection.optionId);
    if (!option || option.components.length === 0) continue;

    if (option.defaultUnitPrice !== null) {
      const cost = option.components.reduce(
        (sum, component) => sum + component.qtyPerUnit * component.catalogItemCost,
        0,
      );
      lines.push({
        catalogItemId: null,
        name: option.name,
        description: option.customerDescription,
        qty: selection.value,
        unitPrice: option.defaultUnitPrice,
        cost,
        taxable: option.components.every((component) => component.catalogItemTaxable),
      });
      continue;
    }

    const multiComponent = option.components.length > 1;
    for (const component of option.components) {
      lines.push({
        catalogItemId: component.catalogItemId,
        name: multiComponent ? `${option.name} — ${component.catalogItemName}` : option.name,
        description: option.customerDescription,
        qty: selection.value * component.qtyPerUnit,
        unitPrice: component.catalogItemPrice,
        cost: component.catalogItemCost,
        taxable: component.catalogItemTaxable,
      });
    }
  }

  return lines;
}
