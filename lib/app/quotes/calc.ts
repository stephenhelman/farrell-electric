/**
 * The single calc used everywhere a quote's totals are needed — builder UI,
 * repo save, future scope-of-work/invoice generation. Ports the mockup's
 * calc() exactly: total floors at 0, margin is 0 when total is 0.
 */
export interface QuoteCalcLineItem {
  qty: number;
  unitPrice: number;
  cost: number;
}

export interface QuoteTotals {
  subtotal: number;
  cost: number;
  total: number;
  profit: number;
  margin: number;
}

export function calcQuoteTotals(lineItems: QuoteCalcLineItem[], discount: number): QuoteTotals {
  const subtotal = lineItems.reduce((sum, item) => sum + item.qty * item.unitPrice, 0);
  const cost = lineItems.reduce((sum, item) => sum + item.qty * item.cost, 0);
  const total = Math.max(0, subtotal - discount);
  const profit = total - cost;
  const margin = total ? (profit / total) * 100 : 0;
  return { subtotal, cost, total, profit, margin };
}
