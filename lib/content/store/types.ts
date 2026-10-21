export type ContentType = "SITE_SETTINGS" | "HOME" | "PAGE" | "LEGAL" | "FINANCING";

export interface ContentFieldRecord {
  id: string;
  documentId: string;
  key: string;
  value: string;
  order: number;
}

export interface ContentDocumentSummary {
  id: string;
  type: ContentType;
  /** "" for singleton documents. */
  slug: string;
  title: string;
}

export interface ContentDocumentRecord extends ContentDocumentSummary {
  fields: ContentFieldRecord[];
}

/** A document's seeded default, before it has database ids. */
export interface DefaultDocument {
  type: ContentType;
  slug: string;
  title: string;
  fields: { key: string; value: string; order: number }[];
}

/**
 * The only surface onto stored website copy. Separate from the quote Repo on
 * purpose: marketing copy and quoting economics share no data path.
 */
export interface ContentStore {
  /** Fields overlay stored rows on seeded defaults, so a missing row yields its default, never a blank. */
  getContentDocument(type: ContentType, slug?: string): Promise<ContentDocumentRecord | null>;
  listContentDocuments(): Promise<ContentDocumentSummary[]>;
  updateContentField(id: string, value: string): Promise<ContentFieldRecord>;
  updateContentFields(updates: { id: string; value: string }[]): Promise<ContentFieldRecord[]>;
}
