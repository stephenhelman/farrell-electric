/**
 * Repository-layer shapes. Mirrors the Prisma schema fields the app actually
 * consumes today — grows entity-by-entity as later tasks add Option/Quote/Job
 * callers, same incremental spirit as lib/content's accessor.
 */
import type { CalcType, UnitOfMeasure } from "@/lib/app/catalog/normalized-seed";

export type AppRole = "OWNER" | "STAFF";

export interface RepoUser {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  role: AppRole;
}

export interface RepoCatalogItem {
  id: string;
  sourceId: number | null;
  name: string;
  description: string | null;
  unitOfMeasure: UnitOfMeasure;
  calcType: CalcType;
  wattage: number | null;
  price: number;
  cost: number;
  taxable: boolean;
  active: boolean;
  isPlaceholder: boolean;
  isSuspectedDuplicate: boolean;
  needsReview: boolean;
  reviewNotes: string | null;
}

export type QuoteStatus = "DRAFT" | "SENT" | "ACCEPTED" | "DECLINED";

export interface RepoQuote {
  id: string;
  number: number;
  status: QuoteStatus;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  customerAddress: string;
  total: number;
  createdAt: Date;
}

export type JobStatus = "UNSCHEDULED" | "SCHEDULED" | "DONE";

export interface RepoJob {
  id: string;
  status: JobStatus;
  installDate: Date | null;
  quoteId: string;
  quoteNumber: number;
  customerName: string;
  customerAddress: string;
  total: number;
}

export interface RepoQuoteLineItem {
  id: string;
  catalogItemId: string | null;
  name: string;
  description: string | null;
  qty: number;
  unitPrice: number;
  cost: number;
  taxable: boolean;
}

export interface RepoQuoteDetail extends RepoQuote {
  customerEmail: string;
  message: string;
  notes: string;
  discount: number;
  subtotal: number;
  cost: number;
  profit: number;
  margin: number;
  lineItems: RepoQuoteLineItem[];
}

export interface QuoteLineItemInput {
  catalogItemId: string | null;
  name: string;
  description: string | null;
  qty: number;
  unitPrice: number;
  cost: number;
  taxable: boolean;
}

/** status is deliberately narrowed to DRAFT | SENT — the builder can only ever
 * save into those two states. ACCEPTED/DECLINED only happen through
 * acceptQuote()/declineQuote(), which also own the Job side-effect. */
export interface SaveQuoteInput {
  id?: string;
  status: "DRAFT" | "SENT";
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  customerAddress: string;
  message: string;
  notes: string;
  discount: number;
  lineItems: QuoteLineItemInput[];
}

export interface Repo {
  getUserByEmail(email: string): Promise<RepoUser | null>;
  listCatalogItems(): Promise<RepoCatalogItem[]>;
  listQuotes(): Promise<RepoQuote[]>;
  listJobs(): Promise<RepoJob[]>;
  getQuote(id: string): Promise<RepoQuoteDetail | null>;
  saveQuote(input: SaveQuoteInput): Promise<RepoQuoteDetail>;
  acceptQuote(id: string): Promise<void>;
  declineQuote(id: string): Promise<void>;
}
