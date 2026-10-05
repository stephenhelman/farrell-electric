import { randomUUID } from "node:crypto";
import type { PublicInvoice, PublicQuote, Repo, RepoJob, RepoLead, RepoQuoteDetail } from "./types";
import { memoryStore, nextQuoteNumber, type MemoryJobRecord, type MemoryQuoteRecord } from "./memory-store";
import { calcQuoteTotals } from "@/lib/app/quotes/calc";

function toPublicQuote(quote: MemoryQuoteRecord): PublicQuote {
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

function toPublicInvoice(quote: MemoryQuoteRecord): PublicInvoice {
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

function leadFor(quote: MemoryQuoteRecord | undefined) {
  return quote?.leadId ? memoryStore.leads.find((l) => l.id === quote.leadId) : undefined;
}

/** Quotes read the sales opp through the lead, same as the Prisma repo. */
function toRepoQuote(quote: MemoryQuoteRecord): RepoQuoteDetail {
  return { ...quote, ghlSalesOpportunityId: leadFor(quote)?.ghlSalesOpportunityId ?? null };
}

function toRepoJob(record: MemoryJobRecord): RepoJob {
  const quote = memoryStore.quotes.find((q) => q.id === record.quoteId);
  return {
    ...record,
    quoteNumber: quote?.number ?? 0,
    customerName: quote?.customerName ?? "",
    customerAddress: quote?.customerAddress ?? "",
    ghlContactId: quote?.ghlContactId ?? null,
    ghlOpsOpportunityId: leadFor(quote)?.ghlOpsOpportunityId ?? null,
    total: quote?.total ?? 0,
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
    return memoryStore.jobs.map(toRepoJob).sort((a, b) => b.quoteNumber - a.quoteNumber);
  },

  async getJob(id) {
    const record = memoryStore.jobs.find((j) => j.id === id);
    return record ? toRepoJob(record) : null;
  },

  async updateJob(id, input) {
    const record = memoryStore.jobs.find((j) => j.id === id);
    if (!record) return null;
    for (const [key, value] of Object.entries(input)) {
      if (value !== undefined) (record as unknown as Record<string, unknown>)[key] = value;
    }
    return toRepoJob(record);
  },

  async sendJobContract(id, terms) {
    const record = memoryStore.jobs.find((j) => j.id === id);
    if (!record || record.contractStatus === "SIGNED") return null;
    record.paymentType = terms.paymentType;
    record.depositRequired = terms.depositRequired;
    record.depositAmount = terms.depositAmount;
    record.contractStatus = "SENT";
    record.contractSentAt = new Date();
    return toRepoJob(record);
  },

  // Single-threaded, so check-then-set is atomic here — the in-memory twin of
  // Prisma's `updateMany WHERE closedAt IS NULL`.
  async claimJobClosed(id) {
    const record = memoryStore.jobs.find((j) => j.id === id);
    if (!record || record.closedAt !== null) return false;
    record.closedAt = new Date();
    return true;
  },

  async claimJobCompleted(id) {
    const record = memoryStore.jobs.find((j) => j.id === id);
    if (!record || record.completedAt !== null) return false;
    record.completedAt = new Date();
    record.status = "DONE";
    return true;
  },

  async getQuote(id) {
    const quote = memoryStore.quotes.find((q) => q.id === id);
    if (!quote) return null;
    return { ...toRepoQuote(quote), lineItems: quote.lineItems.map((item) => ({ ...item })) };
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

      const updated: MemoryQuoteRecord = {
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
        leadId: input.leadId !== undefined ? input.leadId : existing.leadId,
        lineItems,
        ...totals,
      };
      memoryStore.quotes[index] = updated;
      return toRepoQuote(updated);
    }

    const created: MemoryQuoteRecord = {
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
      leadId: input.leadId ?? null,
      publicToken: input.status === "SENT" ? randomUUID() : null,
      ghlContactId: null,
      ghlCustomObjectId: null,
      lineItems,
      createdAt: new Date(),
      ...totals,
    };
    memoryStore.quotes.unshift(created);
    return toRepoQuote(created);
  },

  async acceptQuote(id) {
    const quote = memoryStore.quotes.find((q) => q.id === id);
    if (!quote) throw new Error(`Quote ${id} not found`);
    quote.status = "ACCEPTED";
    // A quote can be accepted straight from DRAFT (never marked Sent), which
    // means no publicToken exists yet — mint one now so the Task 10 invoice
    // link always resolves once a quote is ACCEPTED.
    quote.publicToken ??= randomUUID();

    const existingJob = memoryStore.jobs.find((j) => j.quoteId === id);
    if (existingJob) return existingJob.id;

    const job: MemoryJobRecord = {
      id: randomUUID(),
      status: "UNSCHEDULED",
      quoteId: id,
      paymentType: null,
      depositRequired: false,
      depositAmount: null,
      contractStatus: "NONE",
      contractSentAt: null,
      contractSignedAt: null,
      depositPaid: false,
      depositPaidAt: null,
      finalInvoicePaid: false,
      finalInvoicePaidAt: null,
      installScheduledDate: null,
      installedDate: null,
      revenue: quote.total,
      actualCost: null,
      closedAt: null,
      completedAt: null,
    };
    memoryStore.jobs.unshift(job);
    return job.id;
  },

  async declineQuote(id) {
    const quote = memoryStore.quotes.find((q) => q.id === id);
    if (!quote) return;
    quote.status = "DECLINED";
  },

  async updateQuoteCustomer(id, input) {
    const quote = memoryStore.quotes.find((q) => q.id === id);
    if (!quote) return;
    quote.customerName = input.customerName;
    quote.customerPhone = input.customerPhone;
    quote.customerEmail = input.customerEmail;
    quote.customerAddress = input.customerAddress;
  },

  async updateQuoteGhlIds(id, ids) {
    const quote = memoryStore.quotes.find((q) => q.id === id);
    if (!quote) return;
    if (ids.ghlContactId !== undefined) quote.ghlContactId = ids.ghlContactId;
    if (ids.ghlCustomObjectId !== undefined) quote.ghlCustomObjectId = ids.ghlCustomObjectId;
  },

  async updateLeadGhlIds(id, ids) {
    const lead = memoryStore.leads.find((l) => l.id === id);
    if (!lead) return;
    if (ids.ghlContactId !== undefined) lead.ghlContactId = ids.ghlContactId;
    if (ids.ghlSalesOpportunityId !== undefined) lead.ghlSalesOpportunityId = ids.ghlSalesOpportunityId;
    if (ids.ghlOpsOpportunityId !== undefined) lead.ghlOpsOpportunityId = ids.ghlOpsOpportunityId;
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
      smsConsentTransactional: input.smsConsentTransactional,
      smsConsentPromotional: input.smsConsentPromotional,
      ghlContactId: null,
      ghlSalesOpportunityId: null,
      ghlOpsOpportunityId: null,
    };
    memoryStore.leads.unshift(lead);
    return lead;
  },

  async getLeadById(id) {
    return memoryStore.leads.find((lead) => lead.id === id) ?? null;
  },

  async listLeads() {
    return [...memoryStore.leads];
  },

  async listQuotesByLeadId(leadId) {
    return memoryStore.quotes.filter((q) => q.leadId === leadId).sort((a, b) => b.number - a.number);
  },
};
