import { randomUUID } from "node:crypto";
import type { Lead, Prisma } from "@prisma/client";
import { prisma } from "@/lib/app/db/client";
import { calcQuoteTotals } from "@/lib/app/quotes/calc";
import type { LeadPayload } from "@/lib/leads/types";
import type { Repo, RepoJob, RepoLead, RepoQuoteDetail } from "./types";

// Quotes and jobs are READERS of the GHL opportunity ids — the Lead owns them.
const QUOTE_DETAIL_INCLUDE = {
  lineItems: true,
  lead: { select: { ghlSalesOpportunityId: true } },
} satisfies Prisma.QuoteInclude;

const JOB_INCLUDE = {
  quote: { include: { lead: { select: { ghlOpsOpportunityId: true } } } },
} satisfies Prisma.JobInclude;

type QuoteWithLineItems = Prisma.QuoteGetPayload<{ include: typeof QUOTE_DETAIL_INCLUDE }>;

type JobWithQuote = Prisma.JobGetPayload<{ include: typeof JOB_INCLUDE }>;

function mapJob(job: JobWithQuote): RepoJob {
  return {
    id: job.id,
    status: job.status,
    quoteId: job.quoteId,
    quoteNumber: job.quote.number,
    customerName: job.quote.customerName,
    customerAddress: job.quote.customerAddress,
    ghlContactId: job.quote.ghlContactId,
    ghlOpsOpportunityId: job.quote.lead?.ghlOpsOpportunityId ?? null,
    total: Number(job.quote.total),
    paymentType: job.paymentType,
    depositRequired: job.depositRequired,
    depositAmount: job.depositAmount === null ? null : Number(job.depositAmount),
    contractStatus: job.contractStatus,
    contractSentAt: job.contractSentAt,
    contractSignedAt: job.contractSignedAt,
    depositPaid: job.depositPaid,
    depositPaidAt: job.depositPaidAt,
    finalInvoicePaid: job.finalInvoicePaid,
    finalInvoicePaidAt: job.finalInvoicePaidAt,
    installScheduledDate: job.installScheduledDate,
    installedDate: job.installedDate,
    revenue: Number(job.revenue),
    actualCost: job.actualCost === null ? null : Number(job.actualCost),
    closedAt: job.closedAt,
    completedAt: job.completedAt,
  };
}

function mapQuoteDetail(quote: QuoteWithLineItems): RepoQuoteDetail {
  return {
    id: quote.id,
    number: quote.number,
    status: quote.status,
    customerName: quote.customerName,
    customerPhone: quote.customerPhone,
    customerEmail: quote.customerEmail,
    customerAddress: quote.customerAddress,
    message: quote.message ?? "",
    notes: quote.notes ?? "",
    discount: Number(quote.discount),
    subtotal: Number(quote.subtotal),
    cost: Number(quote.cost),
    total: Number(quote.total),
    profit: Number(quote.profit),
    margin: Number(quote.margin),
    scopeOfWork: quote.scopeOfWork ?? "",
    publicToken: quote.publicToken,
    ghlContactId: quote.ghlContactId,
    ghlSalesOpportunityId: quote.lead?.ghlSalesOpportunityId ?? null,
    ghlCustomObjectId: quote.ghlCustomObjectId,
    leadId: quote.leadId,
    createdAt: quote.createdAt,
    lineItems: quote.lineItems.map((item) => ({
      id: item.id,
      catalogItemId: item.catalogItemId,
      name: item.name,
      description: item.description,
      qty: Number(item.qty),
      unitPrice: Number(item.unitPrice),
      cost: Number(item.cost),
      taxable: item.taxable,
    })),
  };
}

function mapLead(lead: Lead): RepoLead {
  return {
    id: lead.id,
    createdAt: lead.createdAt,
    status: lead.status,
    leadType: lead.leadType,
    source: lead.source,
    name: lead.name,
    phone: lead.phone,
    email: lead.email,
    propertyAddress: lead.propertyAddress,
    details: lead.details as unknown as LeadPayload,
    smsConsentTransactional: lead.smsConsentTransactional,
    smsConsentPromotional: lead.smsConsentPromotional,
    ghlContactId: lead.ghlContactId,
    ghlSalesOpportunityId: lead.ghlSalesOpportunityId,
    ghlOpsOpportunityId: lead.ghlOpsOpportunityId,
  };
}

export const prismaRepo: Repo = {
  async getUserByEmail(email) {
    const user = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });
    if (!user) return null;

    return {
      id: user.id,
      email: user.email,
      passwordHash: user.passwordHash,
      name: user.name,
      role: user.role,
    };
  },

  async listCatalogItems() {
    const items = await prisma.catalogItem.findMany({ orderBy: { sourceId: "asc" } });

    return items.map((item) => ({
      id: item.id,
      sourceId: item.sourceId,
      name: item.name,
      description: item.description,
      unitOfMeasure: item.unitOfMeasure,
      calcType: item.calcType,
      wattage: item.wattage ? Number(item.wattage) : null,
      price: Number(item.price),
      cost: Number(item.cost),
      taxable: item.taxable,
      active: item.active,
      isPlaceholder: item.isPlaceholder,
      isSuspectedDuplicate: item.isSuspectedDuplicate,
      needsReview: item.needsReview,
      reviewNotes: item.reviewNotes,
    }));
  },

  async listOptions() {
    const options = await prisma.option.findMany({
      include: { components: { include: { catalogItem: true } } },
      orderBy: { name: "asc" },
    });

    return options.map((option) => ({
      id: option.id,
      name: option.name,
      customerDescription: option.customerDescription,
      inputType: option.inputType,
      defaultUnitPrice: option.defaultUnitPrice ? Number(option.defaultUnitPrice) : null,
      laborPerUnit: option.laborPerUnit ? Number(option.laborPerUnit) : null,
      active: option.active,
      components: option.components.map((component) => ({
        id: component.id,
        catalogItemId: component.catalogItemId,
        catalogItemName: component.catalogItem.name,
        catalogItemPrice: Number(component.catalogItem.price),
        catalogItemCost: Number(component.catalogItem.cost),
        catalogItemTaxable: component.catalogItem.taxable,
        catalogItemWattage: component.catalogItem.wattage ? Number(component.catalogItem.wattage) : null,
        qtyPerUnit: Number(component.qtyPerUnit),
      })),
    }));
  },

  async listQuotes() {
    const quotes = await prisma.quote.findMany({ orderBy: { number: "desc" } });

    return quotes.map((quote) => ({
      id: quote.id,
      number: quote.number,
      status: quote.status,
      customerName: quote.customerName,
      customerPhone: quote.customerPhone,
      customerEmail: quote.customerEmail,
      customerAddress: quote.customerAddress,
      total: Number(quote.total),
      createdAt: quote.createdAt,
    }));
  },

  async listJobs() {
    const jobs = await prisma.job.findMany({
      include: JOB_INCLUDE,
      orderBy: { quote: { number: "desc" } },
    });

    return jobs.map(mapJob);
  },

  async getJob(id) {
    const job = await prisma.job.findUnique({ where: { id }, include: JOB_INCLUDE });
    return job ? mapJob(job) : null;
  },

  async updateJob(id, input) {
    try {
      const job = await prisma.job.update({ where: { id }, data: input, include: JOB_INCLUDE });
      return mapJob(job);
    } catch (error) {
      // P2025: record to update not found.
      if (error instanceof Error && "code" in error && error.code === "P2025") return null;
      throw error;
    }
  },

  async sendJobContract(id, terms) {
    // The WHERE is the guard: a SIGNED contract matches nothing, so it can't be downgraded.
    const { count } = await prisma.job.updateMany({
      where: { id, contractStatus: { not: "SIGNED" } },
      data: {
        paymentType: terms.paymentType,
        depositRequired: terms.depositRequired,
        depositAmount: terms.depositAmount,
        contractStatus: "SENT",
        contractSentAt: new Date(),
      },
    });
    if (count === 0) return null;
    const job = await prisma.job.findUnique({ where: { id }, include: JOB_INCLUDE });
    return job ? mapJob(job) : null;
  },

  async claimJobClosed(id) {
    const { count } = await prisma.job.updateMany({
      where: { id, closedAt: null },
      data: { closedAt: new Date() },
    });
    return count === 1;
  },

  async claimJobCompleted(id) {
    const { count } = await prisma.job.updateMany({
      where: { id, completedAt: null },
      data: { completedAt: new Date(), status: "DONE" },
    });
    return count === 1;
  },

  async getQuote(id) {
    const quote = await prisma.quote.findUnique({ where: { id }, include: QUOTE_DETAIL_INCLUDE });
    return quote ? mapQuoteDetail(quote) : null;
  },

  async getQuoteByPublicToken(token) {
    const quote = await prisma.quote.findUnique({ where: { publicToken: token }, include: QUOTE_DETAIL_INCLUDE });
    if (!quote) return null;

    return {
      number: quote.number,
      status: quote.status,
      customerName: quote.customerName,
      customerAddress: quote.customerAddress,
      message: quote.message ?? "",
      scopeOfWork: quote.scopeOfWork ?? "",
      discount: Number(quote.discount),
      subtotal: Number(quote.subtotal),
      total: Number(quote.total),
      lineItems: quote.lineItems.map((item) => ({
        name: item.name,
        description: item.description,
        qty: Number(item.qty),
        unitPrice: Number(item.unitPrice),
      })),
    };
  },

  async getInvoiceByPublicToken(token) {
    const quote = await prisma.quote.findUnique({ where: { publicToken: token }, include: QUOTE_DETAIL_INCLUDE });
    if (!quote || quote.status !== "ACCEPTED") return null;

    return {
      invoiceNumber: `INV-${quote.number}`,
      quoteNumber: quote.number,
      customerName: quote.customerName,
      customerAddress: quote.customerAddress,
      scopeOfWork: quote.scopeOfWork ?? "",
      discount: Number(quote.discount),
      subtotal: Number(quote.subtotal),
      total: Number(quote.total),
      lineItems: quote.lineItems.map((item) => ({
        name: item.name,
        description: item.description,
        qty: Number(item.qty),
        unitPrice: Number(item.unitPrice),
      })),
    };
  },

  async saveQuote(input) {
    const totals = calcQuoteTotals(input.lineItems, input.discount);
    const lineItemsData = input.lineItems.map((item) => ({
      catalogItemId: item.catalogItemId,
      name: item.name,
      description: item.description,
      qty: item.qty,
      unitPrice: item.unitPrice,
      cost: item.cost,
      taxable: item.taxable,
    }));

    if (input.id) {
      // Simplest correct approach for a builder that always saves the full
      // line-item set: replace them wholesale rather than diffing.
      await prisma.quoteLineItem.deleteMany({ where: { quoteId: input.id } });

      const existing = await prisma.quote.findUniqueOrThrow({ where: { id: input.id } });
      const publicToken =
        input.status === "SENT" ? (existing.publicToken ?? randomUUID()) : existing.publicToken;

      const updated = await prisma.quote.update({
        where: { id: input.id },
        data: {
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
          subtotal: totals.subtotal,
          cost: totals.cost,
          total: totals.total,
          profit: totals.profit,
          margin: totals.margin,
          ...(input.leadId !== undefined && { leadId: input.leadId }),
          lineItems: { create: lineItemsData },
        },
        include: QUOTE_DETAIL_INCLUDE,
      });
      return mapQuoteDetail(updated);
    }

    const last = await prisma.quote.findFirst({ orderBy: { number: "desc" } });
    const number = (last?.number ?? 1000) + 1;

    const created = await prisma.quote.create({
      data: {
        number,
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
        subtotal: totals.subtotal,
        cost: totals.cost,
        total: totals.total,
        profit: totals.profit,
        margin: totals.margin,
        leadId: input.leadId ?? null,
        lineItems: { create: lineItemsData },
      },
      include: QUOTE_DETAIL_INCLUDE,
    });
    return mapQuoteDetail(created);
  },

  async acceptQuote(id) {
    // A quote can be accepted straight from DRAFT (never marked Sent), which
    // means no publicToken exists yet — mint one now so the Task 10 invoice
    // link always resolves once a quote is ACCEPTED.
    const existing = await prisma.quote.findUniqueOrThrow({ where: { id } });
    const publicToken = existing.publicToken ?? randomUUID();

    await prisma.quote.update({ where: { id }, data: { status: "ACCEPTED", publicToken } });
    const existingJob = await prisma.job.findUnique({ where: { quoteId: id } });
    if (existingJob) return existingJob.id;

    const job = await prisma.job.create({
      data: { quoteId: id, status: "UNSCHEDULED", revenue: existing.total },
    });
    return job.id;
  },

  async declineQuote(id) {
    await prisma.quote.update({ where: { id }, data: { status: "DECLINED" } });
  },

  async updateQuoteCustomer(id, input) {
    await prisma.quote.updateMany({
      where: { id },
      data: {
        customerName: input.customerName,
        customerPhone: input.customerPhone,
        customerEmail: input.customerEmail,
        customerAddress: input.customerAddress,
      },
    });
  },

  async updateQuoteGhlIds(id, ids) {
    try {
      await prisma.quote.update({
        where: { id },
        data: {
          ...(ids.ghlContactId !== undefined && { ghlContactId: ids.ghlContactId }),
          ...(ids.ghlCustomObjectId !== undefined && { ghlCustomObjectId: ids.ghlCustomObjectId }),
        },
      });
    } catch (error) {
      // Unknown dbId — same "quietly no-op" behavior as the memory repo,
      // rather than surfacing as a webhook-processing failure.
      if ((error as { code?: string }).code !== "P2025") throw error;
    }
  },

  async updateLeadGhlIds(id, ids) {
    try {
      await prisma.lead.update({
        where: { id },
        data: {
          ...(ids.ghlContactId !== undefined && { ghlContactId: ids.ghlContactId }),
          ...(ids.ghlSalesOpportunityId !== undefined && { ghlSalesOpportunityId: ids.ghlSalesOpportunityId }),
          ...(ids.ghlOpsOpportunityId !== undefined && { ghlOpsOpportunityId: ids.ghlOpsOpportunityId }),
        },
      });
    } catch (error) {
      if ((error as { code?: string }).code !== "P2025") throw error;
    }
  },

  async createLead(input) {
    const lead = await prisma.lead.create({
      data: {
        leadType: input.leadType,
        name: input.name,
        phone: input.phone,
        email: input.email,
        propertyAddress: input.propertyAddress,
        details: input.details as unknown as Prisma.InputJsonValue,
        smsConsentTransactional: input.smsConsentTransactional,
        smsConsentPromotional: input.smsConsentPromotional,
      },
    });
    return mapLead(lead);
  },

  async getLeadById(id) {
    const lead = await prisma.lead.findUnique({ where: { id } });
    return lead ? mapLead(lead) : null;
  },

  async listLeads() {
    const leads = await prisma.lead.findMany({ orderBy: { createdAt: "desc" } });
    return leads.map(mapLead);
  },

  async listQuotesByLeadId(leadId) {
    const quotes = await prisma.quote.findMany({ where: { leadId }, orderBy: { number: "desc" } });

    return quotes.map((quote) => ({
      id: quote.id,
      number: quote.number,
      status: quote.status,
      customerName: quote.customerName,
      customerPhone: quote.customerPhone,
      customerEmail: quote.customerEmail,
      customerAddress: quote.customerAddress,
      total: Number(quote.total),
      createdAt: quote.createdAt,
    }));
  },
};
