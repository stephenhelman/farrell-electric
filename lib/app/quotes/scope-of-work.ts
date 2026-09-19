/**
 * Assembles a narrative scope of work straight from each line item's own
 * name/description — the same customer-facing text already on the catalog
 * item or option, not invented copy. Callers store the result on
 * Quote.scopeOfWork and the builder lets the owner edit it from there.
 */
export interface ScopeOfWorkLineItem {
  name: string;
  description: string | null;
  qty: number;
}

export function generateScopeOfWork(lineItems: ScopeOfWorkLineItem[]): string {
  if (lineItems.length === 0) return "";

  return lineItems
    .map((item) => {
      const qtyPrefix = item.qty === 1 ? "" : `${item.qty}x `;
      const description = item.description ? ` — ${item.description.replace(/\n+/g, " ")}` : "";
      return `• ${qtyPrefix}${item.name}${description}`;
    })
    .join("\n");
}
