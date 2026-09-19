import { randomUUID } from "node:crypto";
import type { Lead, Prisma } from "@prisma/client";
import { prisma } from "@/lib/app/db/client";
import { calcQuoteTotals } from "@/lib/app/quotes/calc";
import type { LeadPayload } from "@/lib/leads/types";
import type { Repo, RepoLead, RepoQuoteDetail } from "./types";

type QuoteWithLineItems = Prisma.QuoteGetPayload<{ include: { lineItems: true } }>;

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
    ghlOpportunityId: quote.ghlOpportunityId,
    ghlCustomObjectId: quote.ghlCustomObjectId,
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
    ghlContactId: lead.ghlContactId,
    ghlOpportunityId: lead.ghlOpportunityId,
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
      include: { quote: true },
      orderBy: { quote: { number: "desc" } },
    });

    return jobs.map((job) => ({
      id: job.id,
      status: job.status,
      installDate: job.installDate,
      quoteId: job.quoteId,
      quoteNumber: job.quote.number,
      customerName: job.quote.customerName,
      customerAddress: job.quote.customerAddress,
      total: Number(job.quote.total),
    }));
  },

  async getQuote(id) {
    const quote = await prisma.quote.findUnique({ where: { id }, include: { lineItems: true } });
    return quote ? mapQuoteDetail(quote) : null;
  },

  async getQuoteByPublicToken(token) {
    const quote = await prisma.quote.findUnique({ where: { publicToken: token }, include: { lineItems: true } });
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
    const quote = await prisma.quote.findUnique({ where: { publicToken: token }, include: { lineItems: true } });
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
          lineItems: { create: lineItemsData },
        },
        include: { lineItems: true },
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
        lineItems: { create: lineItemsData },
      },
      include: { lineItems: true },
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
    if (!existingJob) {
      await prisma.job.create({ data: { quoteId: id, status: "UNSCHEDULED" } });
    }
  },

  async declineQuote(id) {
    await prisma.quote.update({ where: { id }, data: { status: "DECLINED" } });
  },

  async updateQuoteGhlIds(id, ids) {
    try {
      await prisma.quote.update({
        where: { id },
        data: {
          ...(ids.ghlContactId !== undefined && { ghlContactId: ids.ghlContactId }),
          ...(ids.ghlOpportunityId !== undefined && { ghlOpportunityId: ids.ghlOpportunityId }),
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
          ...(ids.ghlOpportunityId !== undefined && { ghlOpportunityId: ids.ghlOpportunityId }),
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
      },
    });
    return mapLead(lead);
  },

  async getLeadById(id) {
    const lead = await prisma.lead.findUnique({ where: { id } });
    return lead ? mapLead(lead) : null;
  },
};
