import type { RepoQuoteDetail } from "@/lib/app/repo/types";
import type { SowInput } from "./render";

/**
 * RepoQuoteDetail -> SowInput. Hand-mapped field by field: the quote detail
 * carries cost/profit/margin and per-line cost, none of which may reach the
 * PDF. Acceptance falls back to "now, by the rep" for a quote accepted before
 * acceptedAt/acceptedSource were recorded.
 */
export function buildSowInput(quote: RepoQuoteDetail): SowInput {
  return {
    quote: {
      number: quote.number,
      customerName: quote.customerName,
      customerAddress: quote.customerAddress,
      lineItems: quote.lineItems.map((item) => ({
        name: item.name,
        description: item.description,
        qty: item.qty,
        unitPrice: item.unitPrice,
      })),
      discount: quote.discount,
      subtotal: quote.subtotal,
      total: quote.total,
      scopeOfWork: quote.scopeOfWork,
    },
    referenceNumber: String(quote.number),
    acceptance: {
      acceptedByName: quote.customerName,
      acceptedAt: quote.acceptedAt ?? new Date(),
      source: quote.acceptedAt ? (quote.acceptedSource ?? "rep") : "rep",
    },
  };
}
