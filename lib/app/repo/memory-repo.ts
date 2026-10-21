import { randomUUID } from "node:crypto";
import { generateSowSlug } from "@/lib/app/sow/slug";
import type { PublicQuote, Repo, RepoCatalogItem, RepoJob, RepoOption, RepoLead, RepoPayment, RepoQuoteDetail } from "./types";
import { memoryStore, nextQuoteNumber, type MemoryJobRecord, type MemoryQuoteRecord } from "./memory-store";
import { calcQuoteTotals } from "@/lib/app/quotes/calc";
import { buildPayContext } from "@/lib/app/pay/context";

/** Option components denormalise catalog name/price/cost/etc.; the Prisma path joins them live, so edits here must show through. */
function syncOptionComponentSnapshots(item: RepoCatalogItem): void {
  for (const option of memoryStore.options) {
    for (const component of option.components) {
      if (component.catalogItemId !== item.id) continue;
      component.catalogItemName = item.name;
      component.catalogItemPrice = item.price;
      component.catalogItemCost = item.cost;
      component.catalogItemTaxable = item.taxable;
      component.catalogItemWattage = item.wattage;
    }
  }
}

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
    renders: memoryStore.renders
      .filter((r) => r.quoteId === quote.id)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((r) => ({ url: r.url })),
  };
}

function leadFor(quote: MemoryQuoteRecord | undefined) {
  return quote?.leadId ? memoryStore.leads.find((l) => l.id === quote.leadId) : undefined;
}

/** Quotes read the GHL ids through the lead, same as the Prisma repo (contact id falls back to the quote's own column for orphan quotes). */
function toRepoQuote(quote: MemoryQuoteRecord): RepoQuoteDetail {
  return {
    ...quote,
    ghlContactId: quote.ghlContactId ?? leadFor(quote)?.ghlContactId ?? null,
    ghlSalesOpportunityId: leadFor(quote)?.ghlSalesOpportunityId ?? null,
  };
}

function sumPayments(jobId: string): number {
  const cents = memoryStore.payments
    .filter((payment) => payment.jobId === jobId)
    .reduce((total, payment) => total + Math.round(payment.amount * 100), 0);
  return cents / 100;
}

function toRepoJob(record: MemoryJobRecord): RepoJob {
  const quote = memoryStore.quotes.find((q) => q.id === record.quoteId);
  return {
    ...record,
    quoteNumber: quote?.number ?? 0,
    quotePublicToken: quote?.publicToken ?? null,
    customerName: quote?.customerName ?? "",
    customerAddress: quote?.customerAddress ?? "",
    ghlContactId: quote?.ghlContactId ?? leadFor(quote)?.ghlContactId ?? null,
    ghlSalesOpportunityId: leadFor(quote)?.ghlSalesOpportunityId ?? null,
    ghlOpsOpportunityId: leadFor(quote)?.ghlOpsOpportunityId ?? null,
    total: quote?.total ?? 0,
    leadId: quote?.leadId ?? null,
    amountPaid: sumPayments(record.id),
  };
}

/**
 * In-memory fallback used whenever DATABASE_URL is unset — the app builds,
 * runs, and authenticates with zero database credentials.
 */
function generateUniqueSowSlug(): string {
  let slug = generateSowSlug();
  while (memoryStore.jobs.some((j) => j.sowSlug === slug)) slug = generateSowSlug();
  return slug;
}

export const memoryRepo: Repo = {
  async getUserByEmail(email) {
    const normalized = email.trim().toLowerCase();
    return memoryStore.users.find((user) => user.email === normalized) ?? null;
  },

  async listCatalogItems() {
    return memoryStore.catalogItems.map((item) => ({ ...item }));
  },

  async listOptions() {
    return memoryStore.options.map((option) => ({ ...option, components: option.components.map((c) => ({ ...c })) }));
  },

  async createCatalogItem(input) {
    const item: RepoCatalogItem = { id: randomUUID(), sourceId: null, active: true, ...input };
    memoryStore.catalogItems.push(item);
    return { ...item };
  },

  async updateCatalogItem(id, input) {
    const item = memoryStore.catalogItems.find((candidate) => candidate.id === id);
    if (!item) return null;
    Object.assign(item, input);
    syncOptionComponentSnapshots(item);
    return { ...item };
  },

  async setCatalogItemActive(id, active) {
    const item = memoryStore.catalogItems.find((candidate) => candidate.id === id);
    if (!item) return null;
    item.active = active;
    return { ...item };
  },

  async createOption(input) {
    const option: RepoOption = { id: randomUUID(), active: true, components: [], ...input };
    memoryStore.options.push(option);
    return { ...option };
  },

  async updateOption(id, input) {
    const option = memoryStore.options.find((candidate) => candidate.id === id);
    if (!option) return null;
    Object.assign(option, input);
    return { ...option, components: option.components.map((c) => ({ ...c })) };
  },

  async setOptionActive(id, active) {
    const option = memoryStore.options.find((candidate) => candidate.id === id);
    if (!option) return null;
    option.active = active;
    return { ...option, components: option.components.map((c) => ({ ...c })) };
  },

  async listQuotes() {
    return [...memoryStore.quotes].sort((a, b) => b.number - a.number);
  },

  async listJobs() {
    return memoryStore.jobs.map(toRepoJob).sort((a, b) => b.quoteNumber - a.quoteNumber);
  },

  async getSowBlobUrlBySlug(slug) {
    return memoryStore.jobs.find((j) => j.sowSlug === slug)?.sowUrl ?? null;
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
    record.depositRequired = terms.depositRequired;
    record.depositAmount = terms.depositAmount;
    record.contractStatus = "SENT";
    record.contractSentAt = new Date();
    record.depositRequestedAt = null;
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

  async claimJobInstalled(id, installedDate) {
    const record = memoryStore.jobs.find((j) => j.id === id);
    if (!record || record.installedDate !== null) return false;
    record.installedDate = installedDate;
    return true;
  },

  async claimPaymentRequest(id, kind) {
    const record = memoryStore.jobs.find((j) => j.id === id);
    const field = kind === "deposit" ? "depositRequestedAt" : "balanceRequestedAt";
    if (!record || record[field] !== null) return false;
    record[field] = new Date();
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
      declineReason: null,
      declineReasonDetail: null,
      acceptedAt: null,
      acceptedSource: null,
      lineItems,
      createdAt: new Date(),
      ...totals,
    };
    memoryStore.quotes.unshift(created);
    return toRepoQuote(created);
  },

  async findQuoteIdByPublicToken(token) {
    return memoryStore.quotes.find((q) => q.publicToken === token)?.id ?? null;
  },

  async listQuoteRenders(quoteId) {
    return memoryStore.renders.filter((r) => r.quoteId === quoteId).sort((a, b) => a.sortOrder - b.sortOrder).map((r) => ({ ...r }));
  },

  async addQuoteRender(quoteId, url) {
    if (!memoryStore.quotes.some((q) => q.id === quoteId)) return null;
    const max = memoryStore.renders.filter((r) => r.quoteId === quoteId).reduce((n, r) => Math.max(n, r.sortOrder), -1);
    const render = { id: randomUUID(), quoteId, url, sortOrder: max + 1, caption: null };
    memoryStore.renders.push(render);
    return { ...render };
  },

  async reorderQuoteRenders(quoteId, orderedIds) {
    const mine = memoryStore.renders.filter((r) => r.quoteId === quoteId).sort((a, b) => a.sortOrder - b.sortOrder);
    const rank = new Map(orderedIds.map((id, i) => [id, i]));
    const ordered = [...mine].sort((a, b) => (rank.get(a.id) ?? orderedIds.length + a.sortOrder) - (rank.get(b.id) ?? orderedIds.length + b.sortOrder));
    ordered.forEach((r, i) => {
      r.sortOrder = i;
    });
  },

  async deleteQuoteRender(id) {
    const i = memoryStore.renders.findIndex((r) => r.id === id);
    if (i === -1) return null;
    const [removed] = memoryStore.renders.splice(i, 1);
    return removed;
  },

  async markQuoteSent(id) {
    const quote = memoryStore.quotes.find((q) => q.id === id);
    if (!quote || quote.status !== "DRAFT") return false;
    quote.status = "SENT";
    quote.publicToken ??= randomUUID();
    return true;
  },

  async acceptQuote(id, source) {
    const quote = memoryStore.quotes.find((q) => q.id === id);
    if (!quote || (quote.status !== "DRAFT" && quote.status !== "SENT")) return false;
    quote.status = "ACCEPTED";
    quote.acceptedAt = new Date();
    quote.acceptedSource = source;
    // A quote can be accepted straight from DRAFT (never marked Sent), which
    // means no publicToken exists yet — mint one now so the invoice link
    // always resolves once a quote is ACCEPTED.
    quote.publicToken ??= randomUUID();
    return true;
  },

  // Single-threaded, so check-then-insert is atomic — the twin of the unique externalRef index.
  async createPayment(input) {
    const existing = memoryStore.payments.find((p) => p.externalRef === input.externalRef);
    if (existing) return { payment: { ...existing }, created: false };
    const payment: RepoPayment = { id: randomUUID(), ...input, createdAt: new Date() };
    memoryStore.payments.push(payment);
    return { payment: { ...payment }, created: true };
  },

  async listPaymentsForJob(jobId) {
    return memoryStore.payments
      .filter((payment) => payment.jobId === jobId)
      .sort((a, b) => a.paidAt.getTime() - b.paidAt.getTime())
      .map((payment) => ({ ...payment }));
  },

  async sumPaymentsForJob(jobId) {
    return sumPayments(jobId);
  },

  async ensureJobForQuote(id) {
    const quote = memoryStore.quotes.find((q) => q.id === id);
    if (!quote || quote.status !== "ACCEPTED") return null;

    const existingJob = memoryStore.jobs.find((j) => j.quoteId === id);
    if (existingJob) return { id: existingJob.id, created: false };

    const job: MemoryJobRecord = {
      id: randomUUID(),
      status: "UNSCHEDULED",
      quoteId: id,
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
      sowUrl: null,
      sowGeneratedAt: null,
      payToken: randomUUID(),
      sowSlug: generateUniqueSowSlug(),
      depositRequestedAt: null,
      balanceRequestedAt: null,
      closedAt: null,
      completedAt: null,
    };
    memoryStore.jobs.unshift(job);
    return { id: job.id, created: true };
  },

  async ensurePayToken(jobId) {
    const record = memoryStore.jobs.find((j) => j.id === jobId);
    if (!record) return null;
    record.payToken ??= randomUUID();
    return record.payToken;
  },

  async ensureSowSlug(jobId) {
    const record = memoryStore.jobs.find((j) => j.id === jobId);
    if (!record) return null;
    record.sowSlug ??= generateUniqueSowSlug();
    return record.sowSlug;
  },

  async getPayContextByToken(payToken) {
    const record = memoryStore.jobs.find((j) => j.payToken === payToken);
    if (!record) return null;
    if (record.sowUrl) await memoryRepo.ensureSowSlug(record.id);
    const payments = memoryStore.payments.filter((p) => p.jobId === record.id).sort((a, b) => a.paidAt.getTime() - b.paidAt.getTime());
    return buildPayContext(toRepoJob(record), payments);
  },

  async declineQuote(id, input) {
    const quote = memoryStore.quotes.find((q) => q.id === id);
    if (!quote || (quote.status !== "DRAFT" && quote.status !== "SENT")) return false;
    quote.status = "DECLINED";
    quote.declineReason = input.reason;
    quote.declineReasonDetail = input.detail;
    return true;
  },

  async expireQuote(id) {
    const quote = memoryStore.quotes.find((q) => q.id === id);
    if (!quote || quote.status !== "SENT") return false;
    quote.status = "EXPIRED";
    return true;
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
    if (!quote) return "unknown";
    // Mirrors the Prisma @unique on ghlCustomObjectId.
    if (
      ids.ghlCustomObjectId &&
      memoryStore.quotes.some((q) => q.id !== id && q.ghlCustomObjectId === ids.ghlCustomObjectId)
    ) {
      console.error(`[repo] ghlCustomObjectId already belongs to another quote — not written for quote ${id}`);
      return "duplicate_custom_object";
    }
    if (ids.ghlContactId !== undefined) quote.ghlContactId = ids.ghlContactId;
    if (ids.ghlCustomObjectId !== undefined) quote.ghlCustomObjectId = ids.ghlCustomObjectId;
    return "updated";
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
      source: input.source ?? "contact_form",
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
