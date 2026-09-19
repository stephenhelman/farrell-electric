import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/app/db/client";
import { calcQuoteTotals } from "@/lib/app/quotes/calc";
import type { Repo, RepoQuoteDetail } from "./types";

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
    await prisma.quote.update({ where: { id }, data: { status: "ACCEPTED" } });
    const existingJob = await prisma.job.findUnique({ where: { quoteId: id } });
    if (!existingJob) {
      await prisma.job.create({ data: { quoteId: id, status: "UNSCHEDULED" } });
    }
  },

  async declineQuote(id) {
    await prisma.quote.update({ where: { id }, data: { status: "DECLINED" } });
  },
};
