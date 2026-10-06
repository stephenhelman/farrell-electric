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
export type PaymentType = "CARD" | "CHECK" | "CASH" | "FINANCING" | "OTHER";
export type ContractStatus = "NONE" | "SENT" | "SIGNED";

/**
 * The post-sale record. INTERNAL: carries revenue/actualCost, so it must
 * never be spread or passed into a customer-facing surface or GHL payload —
 * outbound job events are hand-mapped from it (economics wall).
 *
 * Lifecycle state is the flags + dates below; Closed is derived from closedAt
 * (JobStatus has no CLOSED value). See lib/app/jobs/lifecycle.ts for the gates.
 */
export interface RepoJob {
  id: string;
  status: JobStatus;
  quoteId: string;

  // Read through from the quote (the single source for client info).
  quoteNumber: number;
  customerName: string;
  customerAddress: string;
  /** Null until the GHL lead round-trip has written it back to the quote. */
  ghlContactId: string | null;
  /**
   * The Operations-pipeline opportunity id, read through quote → lead (the Lead
   * owns it). Null until the ops echo-back lands, and always null for an orphan
   * job whose quote has no lead.
   */
  ghlOpsOpportunityId: string | null;
  /** The accepted quote's customer-facing total. */
  total: number;

  // Deal terms — null/false until the Generate Contract modal sets them.
  paymentType: PaymentType | null;
  depositRequired: boolean;
  depositAmount: number | null;

  contractStatus: ContractStatus;
  contractSentAt: Date | null;
  contractSignedAt: Date | null;

  depositPaid: boolean;
  depositPaidAt: Date | null;
  finalInvoicePaid: boolean;
  finalInvoicePaidAt: Date | null;

  installScheduledDate: Date | null;
  /** Also the warranty start. */
  installedDate: Date | null;

  // INTERNAL financials. revenue defaults from the quote total at job creation.
  revenue: number;
  actualCost: number | null;

  /** Set once, by claimJobClosed / claimJobCompleted — records that the gate already fired. */
  closedAt: Date | null;
  completedAt: Date | null;
}

/** Client info as confirmed in the Generate Contract modal — written back to the Quote (the single source). */
export interface QuoteCustomerInput {
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  customerAddress: string;
}

/** The deal terms captured by the Generate Contract modal. */
export interface JobDealTermsInput {
  paymentType: PaymentType;
  depositRequired: boolean;
  /** Must be null when depositRequired is false. */
  depositAmount: number | null;
}

/**
 * Mutable Job fields. undefined = leave unchanged (same convention as the GHL
 * id inputs). closedAt/completedAt are deliberately absent — they are only
 * ever written by the claim methods, which guard against double-firing.
 */
export interface JobUpdateInput {
  status?: JobStatus;
  paymentType?: PaymentType | null;
  depositRequired?: boolean;
  depositAmount?: number | null;
  contractStatus?: ContractStatus;
  contractSentAt?: Date | null;
  contractSignedAt?: Date | null;
  depositPaid?: boolean;
  depositPaidAt?: Date | null;
  finalInvoicePaid?: boolean;
  finalInvoicePaidAt?: Date | null;
  installScheduledDate?: Date | null;
  installedDate?: Date | null;
  revenue?: number;
  actualCost?: number | null;
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
  /**
   * The Sales-pipeline opportunity id, READ THROUGH the lead (the Lead owns it;
   * there is no Quote column). Null until the New Lead echo-back lands, and
   * always null for an orphan quote (leadId null).
   * KNOWN DEBT: ghlContactId above is still a Quote column for the same orphan
   * reason — fold it into this read-through once lead-on-quote-creation lands.
   */
  ghlSalesOpportunityId: string | null;
  /** The GHL custom-object id (quote mirror), same write path as ghlContactId. */
  ghlCustomObjectId: string | null;
  /** Internal navigation/provenance only — GHL correlation still rides on customer identity. */
  leadId: string | null;
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
  /** Set only when the quote was created from a lead's "Create Quote" action. */
  leadId?: string | null;
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
  ghlCustomObjectId?: string | null;
}

/** Outcome of writing quote GHL ids — lets the inbound handler answer "200 ignored" instead of failing. */
export type QuoteGhlIdsResult = "updated" | "unknown" | "duplicate_custom_object";

export interface LeadGhlIdsInput {
  ghlContactId?: string | null;
  ghlSalesOpportunityId?: string | null;
  ghlOpsOpportunityId?: string | null;
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
  /** Provable consent state — captured at submission, independent of `details`. */
  smsConsentTransactional: boolean;
  smsConsentPromotional: boolean;
  ghlContactId: string | null;
  ghlSalesOpportunityId: string | null;
  ghlOpsOpportunityId: string | null;
}

export interface CreateLeadInput {
  /** Where the lead came from; defaults to "contact_form" (the public site form). */
  source?: string;
  leadType: LeadType;
  name: string;
  phone: string;
  email: string | null;
  propertyAddress: string | null;
  details: LeadPayload;
  smsConsentTransactional: boolean;
  smsConsentPromotional: boolean;
}

export interface Repo {
  getUserByEmail(email: string): Promise<RepoUser | null>;
  listCatalogItems(): Promise<RepoCatalogItem[]>;
  listOptions(): Promise<RepoOption[]>;
  listQuotes(): Promise<RepoQuote[]>;
  listJobs(): Promise<RepoJob[]>;
  getJob(id: string): Promise<RepoJob | null>;
  /** Partial update; returns the updated job, or null if the id doesn't exist. */
  updateJob(id: string, input: JobUpdateInput): Promise<RepoJob | null>;
  /**
   * Persists the deal terms and sets contractStatus = SENT + contractSentAt in
   * one conditional write that only applies while the contract is NOT SIGNED
   * — so a signature that lands mid-regeneration can never be downgraded back
   * to SENT. Returns the updated job, or null if the job is missing or already
   * SIGNED (nothing written).
   */
  sendJobContract(id: string, terms: JobDealTermsInput): Promise<RepoJob | null>;
  /**
   * Atomically stamps closedAt, only if it is still null. Resolves true for
   * exactly one caller (the one that should fire job.closed) and false for
   * every re-delivery/concurrent caller. Does NOT evaluate the gate itself —
   * callers check lib/app/jobs/lifecycle.ts first.
   */
  claimJobClosed(id: string): Promise<boolean>;
  /** Same guard for completedAt; the winning call also sets status = DONE. */
  claimJobCompleted(id: string): Promise<boolean>;
  getQuote(id: string): Promise<RepoQuoteDetail | null>;
  getQuoteByPublicToken(token: string): Promise<PublicQuote | null>;
  /** Returns null for a token whose quote isn't ACCEPTED yet — no invoice before acceptance. */
  getInvoiceByPublicToken(token: string): Promise<PublicInvoice | null>;
  saveQuote(input: SaveQuoteInput): Promise<RepoQuoteDetail>;
  /** Idempotent. Returns the id of the Job spawned (or already existing) for the accepted quote. */
  acceptQuote(id: string): Promise<string>;
  declineQuote(id: string): Promise<void>;
  /** Overwrites the customer identity fields on a quote; no-op if the id doesn't exist. */
  updateQuoteCustomer(id: string, input: QuoteCustomerInput): Promise<void>;
  /** Written only by the inbound GHL webhook handler (app/api/webhooks/ghl). */
  updateQuoteGhlIds(id: string, ids: QuoteGhlIdsInput): Promise<QuoteGhlIdsResult>;
  /** Written only by the inbound GHL webhook handler (app/api/webhooks/ghl). */
  updateLeadGhlIds(id: string, ids: LeadGhlIdsInput): Promise<void>;
  createLead(input: CreateLeadInput): Promise<RepoLead>;
  getLeadById(id: string): Promise<RepoLead | null>;
  listLeads(): Promise<RepoLead[]>;
  listQuotesByLeadId(leadId: string): Promise<RepoQuote[]>;
}
