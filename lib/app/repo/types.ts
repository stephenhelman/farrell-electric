/**
 * Repository-layer shapes. Mirrors the Prisma schema fields the app actually
 * consumes today — grows entity-by-entity as later tasks add Option/Quote/Job
 * callers, same incremental spirit as lib/content's accessor.
 */
import type { CalcType, UnitOfMeasure } from "@/lib/app/catalog/normalized-seed";
import type { OptionInputType } from "@/lib/app/options/normalized-seed";

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
  /** Set by Task 9's GHL sync — never user-editable, only ever written via updateQuoteGhlIds. */
  ghlContactId: string | null;
  ghlOpportunityId: string | null;
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

export interface GhlIdsInput {
  ghlContactId: string | null;
  ghlOpportunityId: string | null;
}

export interface Repo {
  getUserByEmail(email: string): Promise<RepoUser | null>;
  listCatalogItems(): Promise<RepoCatalogItem[]>;
  listOptions(): Promise<RepoOption[]>;
  listQuotes(): Promise<RepoQuote[]>;
  listJobs(): Promise<RepoJob[]>;
  getQuote(id: string): Promise<RepoQuoteDetail | null>;
  getQuoteByPublicToken(token: string): Promise<PublicQuote | null>;
  saveQuote(input: SaveQuoteInput): Promise<RepoQuoteDetail>;
  acceptQuote(id: string): Promise<void>;
  declineQuote(id: string): Promise<void>;
  /** Written only by the Task 9 GHL sync after a successful contact/opportunity upsert. */
  updateQuoteGhlIds(id: string, ids: GhlIdsInput): Promise<void>;
}
