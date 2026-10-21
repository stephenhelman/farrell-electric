/**
 * In-memory content store used whenever DATABASE_URL is unset. Serves the
 * seeded defaults; edits live only for the life of the process.
 */
import { getDefaultDocument, getDefaultDocuments } from "./defaults";
import type {
  ContentDocumentRecord,
  ContentDocumentSummary,
  ContentFieldRecord,
  ContentStore,
  ContentType,
} from "./types";

const docId = (type: ContentType, slug: string) => `${type}:${slug}`;
const fieldId = (type: ContentType, slug: string, key: string) => `${type}:${slug}:${key}`;

// id -> value overrides applied on top of the seeded defaults.
const edits = new Map<string, string>();

function build(type: ContentType, slug: string): ContentDocumentRecord | null {
  const def = getDefaultDocument(type, slug);
  if (!def) return null;
  const documentId = docId(type, slug);
  return {
    id: documentId,
    type,
    slug,
    title: def.title,
    fields: def.fields.map((field) => {
      const id = fieldId(type, slug, field.key);
      return { id, documentId, key: field.key, value: edits.get(id) ?? field.value, order: field.order };
    }),
  };
}

function findField(id: string): ContentFieldRecord | null {
  for (const def of getDefaultDocuments()) {
    const doc = build(def.type, def.slug);
    const field = doc?.fields.find((candidate) => candidate.id === id);
    if (field) return field;
  }
  return null;
}

export const memoryContentStore: ContentStore = {
  async getContentDocument(type, slug = "") {
    return build(type, slug);
  },

  async listContentDocuments(): Promise<ContentDocumentSummary[]> {
    return getDefaultDocuments().map(({ type, slug, title }) => ({ id: docId(type, slug), type, slug, title }));
  },

  async updateContentField(id, value) {
    const existing = findField(id);
    if (!existing) throw new Error(`Unknown content field: ${id}`);
    edits.set(id, value);
    return { ...existing, value };
  },

  async updateContentFields(updates) {
    const results: ContentFieldRecord[] = [];
    for (const { id, value } of updates) {
      if (!findField(id)) throw new Error(`Unknown content field: ${id}`);
    }
    for (const { id, value } of updates) {
      results.push(await this.updateContentField(id, value));
    }
    return results;
  },
};
