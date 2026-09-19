/**
 * Repository-layer shapes. Mirrors the Prisma schema fields the app actually
 * consumes today — grows entity-by-entity as later tasks add Option/Quote/Job
 * callers, same incremental spirit as lib/content's accessor.
 */
import type { CalcType, UnitOfMeasure } from "@/lib/app/catalog/normalized-seed";
import type { OptionInputType } from "@/lib/app/options/normalized-seed";
import type { LeadPayload } from "@/lib/leads/types";

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

export interface RepoOptionComponent {
  id: string;
  catalogItemId: string;
  catalogItemName: string;
  catalogItemPrice: number;
  catalogItemCost: number;
  catalogItemTaxable: boolean;
  catalogItemWattage: number | null;
  qtyPerUnit: number;
}

export interface RepoOption {
  id: string;
  name: string;
  customerDescription: string;
  inputType: OptionInputType;
  /** TODO(owner): package pricing per unit — null until provided. */
  defaultUnitPrice: number | null;
  /** TODO(owner): labor cost/time per unit — null until provided. */
  laborPerUnit: number | null;
  active: boolean;
  components: RepoOptionComponent[];
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
  scopeOfWork: string;
  /** Set the moment a quote is first marked SENT; powers the public quote-link route. */
  publicToken: string | null;
  /** Never user-editable — only ever written via updateQuoteGhlIds, by the inbound GHL webhook handler. */
  ghlContactId: string | null;
  ghlOpportunityId: string | null;
  /** The GHL custom-object id (quote mirror), same write path as ghlContactId. */
  ghlCustomObjectId: string | null;
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
  scopeOfWork: string;
  lineItems: QuoteLineItemInput[];
}

/**
 * Everything (and ONLY everything) a customer should see at the public,
 * unauthenticated quote-link route. No cost/profit/margin, no catalogItemId,
 * no internal notes, no contact info beyond the customer's own name/address.
 */
export interface PublicQuoteLineItem {
  name: string;
  description: string | null;
  qty: number;
  unitPrice: number;
}

export interface PublicQuote {
  number: number;
  status: QuoteStatus;
  customerName: string;
  customerAddress: string;
  message: string;
  scopeOfWork: string;
  discount: number;
  subtotal: number;
  total: number;
  lineItems: PublicQuoteLineItem[];
}

/**
 * Fields written by the inbound GHL webhook handler (Task 4). Each is
 * optional/undefined-means-"leave unchanged" — a single GHL callback rarely
 * carries every id at once (e.g. the lead round-trip has no custom-object
 * id), so a partial update must never null out a field the payload omitted.
 */
export interface QuoteGhlIdsInput {
  ghlContactId?: string | null;
  ghlOpportunityId?: string | null;
  ghlCustomObjectId?: string | null;
}

export interface LeadGhlIdsInput {
  ghlContactId?: string | null;
  ghlOpportunityId?: string | null;
}

/**
 * Task 10: the invoice is a derived document, not a stored entity — the
 * sprint's locked §2 schema has no Invoice model, and everything it needs
 * (line items, totals) is already final and immutable once a quote is
 * ACCEPTED. Same public-payload discipline as PublicQuote: no cost/profit/
 * margin, no catalogItemId, no contact info beyond name/address.
 */
export interface PublicInvoice {
  invoiceNumber: string;
  quoteNumber: number;
  customerName: string;
  customerAddress: string;
  scopeOfWork: string;
  discount: number;
  subtotal: number;
  total: number;
  lineItems: PublicQuoteLineItem[];
}

export type LeadType = "LIGHTING" | "ELECTRICAL";
export type LeadStatus = "NEW" | "SYNCED";

export interface RepoLead {
  id: string;
  createdAt: Date;
  status: LeadStatus;
  leadType: LeadType;
  source: string;
  name: string;
  phone: string;
  email: string | null;
  propertyAddress: string | null;
  details: LeadPayload;
  ghlContactId: string | null;
  ghlOpportunityId: string | null;
}

export interface CreateLeadInput {
  leadType: LeadType;
  name: string;
  phone: string;
  email: string | null;
  propertyAddress: string | null;
  details: LeadPayload;
}

export interface Repo {
  getUserByEmail(email: string): Promise<RepoUser | null>;
  listCatalogItems(): Promise<RepoCatalogItem[]>;
  listOptions(): Promise<RepoOption[]>;
  listQuotes(): Promise<RepoQuote[]>;
  listJobs(): Promise<RepoJob[]>;
  getQuote(id: string): Promise<RepoQuoteDetail | null>;
  getQuoteByPublicToken(token: string): Promise<PublicQuote | null>;
  /** Returns null for a token whose quote isn't ACCEPTED yet — no invoice before acceptance. */
  getInvoiceByPublicToken(token: string): Promise<PublicInvoice | null>;
  saveQuote(input: SaveQuoteInput): Promise<RepoQuoteDetail>;
  acceptQuote(id: string): Promise<void>;
  declineQuote(id: string): Promise<void>;
  /** Written only by the inbound GHL webhook handler (app/api/webhooks/ghl). */
  updateQuoteGhlIds(id: string, ids: QuoteGhlIdsInput): Promise<void>;
  /** Written only by the inbound GHL webhook handler (app/api/webhooks/ghl). */
  updateLeadGhlIds(id: string, ids: LeadGhlIdsInput): Promise<void>;
  createLead(input: CreateLeadInput): Promise<RepoLead>;
  getLeadById(id: string): Promise<RepoLead | null>;
}
