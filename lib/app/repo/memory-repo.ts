import { randomUUID } from "node:crypto";
import type { PublicInvoice, PublicQuote, Repo, RepoLead, RepoQuoteDetail } from "./types";
import { memoryStore, nextQuoteNumber } from "./memory-store";
import { calcQuoteTotals } from "@/lib/app/quotes/calc";

function toPublicQuote(quote: RepoQuoteDetail): PublicQuote {
  return {
    number: quote.number,
    status: quote.status,
    customerName: quote.customerName,
    customerAddress: quote.customerAddress,
    message: quote.message,
    scopeOfWork: quote.scopeOfWork,
    discount: quote.discount,
    subtotal: quote.subtotal,
    total: quote.total,
    lineItems: quote.lineItems.map((item) => ({
      name: item.name,
      description: item.description,
      qty: item.qty,
      unitPrice: item.unitPrice,
    })),
  };
}

function toPublicInvoice(quote: RepoQuoteDetail): PublicInvoice {
  return {
    invoiceNumber: `INV-${quote.number}`,
    quoteNumber: quote.number,
    customerName: quote.customerName,
    customerAddress: quote.customerAddress,
    scopeOfWork: quote.scopeOfWork,
    discount: quote.discount,
    subtotal: quote.subtotal,
    total: quote.total,
    lineItems: quote.lineItems.map((item) => ({
      name: item.name,
      description: item.description,
      qty: item.qty,
      unitPrice: item.unitPrice,
    })),
  };
}

/**
 * In-memory fallback used whenever DATABASE_URL is unset — the app builds,
 * runs, and authenticates with zero database credentials.
 */
export const memoryRepo: Repo = {
  async getUserByEmail(email) {
    const normalized = email.trim().toLowerCase();
    return memoryStore.users.find((user) => user.email === normalized) ?? null;
  },

  async listCatalogItems() {
    return memoryStore.catalogItems;
  },

  async listOptions() {
    return memoryStore.options;
  },

  async listQuotes() {
    return [...memoryStore.quotes].sort((a, b) => b.number - a.number);
  },

  async listJobs() {
    return [...memoryStore.jobs].sort((a, b) => b.quoteNumber - a.quoteNumber);
  },

  async getQuote(id) {
    const quote = memoryStore.quotes.find((q) => q.id === id);
    if (!quote) return null;
    return { ...quote, lineItems: quote.lineItems.map((item) => ({ ...item })) };
  },

  async getQuoteByPublicToken(token) {
    const quote = memoryStore.quotes.find((q) => q.publicToken === token);
    return quote ? toPublicQuote(quote) : null;
  },

  async getInvoiceByPublicToken(token) {
    const quote = memoryStore.quotes.find((q) => q.publicToken === token);
    if (!quote || quote.status !== "ACCEPTED") return null;
    return toPublicInvoice(quote);
  },

  async saveQuote(input) {
    const totals = calcQuoteTotals(input.lineItems, input.discount);
    const lineItems = input.lineItems.map((item) => ({ id: randomUUID(), ...item }));

    if (input.id) {
      const index = memoryStore.quotes.findIndex((q) => q.id === input.id);
      if (index === -1) throw new Error(`Quote not found: ${input.id}`);

      const existing = memoryStore.quotes[index];
      const publicToken = input.status === "SENT" ? (existing.publicToken ?? randomUUID()) : existing.publicToken;

      const updated: RepoQuoteDetail = {
        ...existing,
        status: input.status,
        customerName: input.customerName,
        customerPhone: input.customerPhone,
        customerEmail: input.customerEmail,
        customerAddress: input.customerAddress,
        message: input.message,
        notes: input.notes,
        discount: input.discount,
        scopeOfWork: input.scopeOfWork,
        publicToken,
        lineItems,
        ...totals,
      };
      memoryStore.quotes[index] = updated;
      return updated;
    }

    const created: RepoQuoteDetail = {
      id: randomUUID(),
      number: nextQuoteNumber(),
      status: input.status,
      customerName: input.customerName,
      customerPhone: input.customerPhone,
      customerEmail: input.customerEmail,
      customerAddress: input.customerAddress,
      message: input.message,
      notes: input.notes,
      discount: input.discount,
      scopeOfWork: input.scopeOfWork,
      publicToken: input.status === "SENT" ? randomUUID() : null,
      ghlContactId: null,
      ghlOpportunityId: null,
      ghlCustomObjectId: null,
      lineItems,
      createdAt: new Date(),
      ...totals,
    };
    memoryStore.quotes.unshift(created);
    return created;
  },

  async acceptQuote(id) {
    const quote = memoryStore.quotes.find((q) => q.id === id);
    if (!quote) return;
    quote.status = "ACCEPTED";
    // A quote can be accepted straight from DRAFT (never marked Sent), which
    // means no publicToken exists yet — mint one now so the Task 10 invoice
    // link always resolves once a quote is ACCEPTED.
    quote.publicToken ??= randomUUID();

    if (!memoryStore.jobs.find((j) => j.quoteId === id)) {
      memoryStore.jobs.unshift({
        id: randomUUID(),
        status: "UNSCHEDULED",
        installDate: null,
        quoteId: id,
        quoteNumber: quote.number,
        customerName: quote.customerName,
        customerAddress: quote.customerAddress,
        total: quote.total,
      });
    }
  },

  async declineQuote(id) {
    const quote = memoryStore.quotes.find((q) => q.id === id);
    if (!quote) return;
    quote.status = "DECLINED";
  },

  async updateQuoteGhlIds(id, ids) {
    const quote = memoryStore.quotes.find((q) => q.id === id);
    if (!quote) return;
    if (ids.ghlContactId !== undefined) quote.ghlContactId = ids.ghlContactId;
    if (ids.ghlOpportunityId !== undefined) quote.ghlOpportunityId = ids.ghlOpportunityId;
    if (ids.ghlCustomObjectId !== undefined) quote.ghlCustomObjectId = ids.ghlCustomObjectId;
  },

  async updateLeadGhlIds(id, ids) {
    const lead = memoryStore.leads.find((l) => l.id === id);
    if (!lead) return;
    if (ids.ghlContactId !== undefined) lead.ghlContactId = ids.ghlContactId;
    if (ids.ghlOpportunityId !== undefined) lead.ghlOpportunityId = ids.ghlOpportunityId;
  },

  async createLead(input) {
    const lead: RepoLead = {
      id: randomUUID(),
      createdAt: new Date(),
      status: "NEW",
      leadType: input.leadType,
      source: "contact_form",
      name: input.name,
      phone: input.phone,
      email: input.email,
      propertyAddress: input.propertyAddress,
      details: input.details,
      ghlContactId: null,
      ghlOpportunityId: null,
    };
    memoryStore.leads.unshift(lead);
    return lead;
  },

  async getLeadById(id) {
    return memoryStore.leads.find((lead) => lead.id === id) ?? null;
  },
};
