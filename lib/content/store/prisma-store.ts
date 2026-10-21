/**
 * Database-backed content store. The only file in lib/content that touches
 * Prisma; loaded only when DATABASE_URL is set.
 *
 * Reads overlay stored rows onto the seeded defaults by key, so a document or
 * field that has no row yet still returns its default — never a blank.
 */
import { prisma } from "@/lib/app/db/client";
import { getDefaultDocument, getDefaultDocuments } from "./defaults";
import type {
  ContentDocumentRecord,
  ContentDocumentSummary,
  ContentFieldRecord,
  ContentStore,
  ContentType,
} from "./types";

function toField(row: { id: string; documentId: string; key: string; value: string; order: number }): ContentFieldRecord {
  return { id: row.id, documentId: row.documentId, key: row.key, value: row.value, order: row.order };
}

export const prismaContentStore: ContentStore = {
  async getContentDocument(type, slug = "") {
    const def = getDefaultDocument(type, slug);
    const row = await prisma.contentDocument.findUnique({
      where: { type_slug: { type, slug } },
      include: { fields: true },
    });
    if (!def && !row) return null;

    const stored = new Map((row?.fields ?? []).map((field) => [field.key, field]));
    const documentId = row?.id ?? `${type}:${slug}`;
    const fields: ContentFieldRecord[] = [];

    for (const field of def?.fields ?? []) {
      const hit = stored.get(field.key);
      fields.push(
        hit
          ? toField(hit)
          : { id: `${type}:${slug}:${field.key}`, documentId, key: field.key, value: field.value, order: field.order },
      );
      stored.delete(field.key);
    }
    // Stored rows with no seeded default (not expected in v1) are kept, after the defaults.
    for (const hit of [...stored.values()].sort((a, b) => a.order - b.order)) fields.push(toField(hit));

    return { id: documentId, type, slug, title: row?.title ?? def!.title, fields };
  },

  async listContentDocuments(): Promise<ContentDocumentSummary[]> {
    const rows = await prisma.contentDocument.findMany({ select: { id: true, type: true, slug: true, title: true } });
    const byKey = new Map(rows.map((row) => [`${row.type}:${row.slug}`, row]));
    const out: ContentDocumentSummary[] = getDefaultDocuments().map(({ type, slug, title }) => {
      const row = byKey.get(`${type}:${slug}`);
      byKey.delete(`${type}:${slug}`);
      return { id: row?.id ?? `${type}:${slug}`, type, slug, title: row?.title ?? title };
    });
    for (const row of byKey.values()) out.push(row);
    return out;
  },

  async updateContentField(id, value) {
    return toField(await writeField(id, value));
  },

  async updateContentFields(updates) {
    const rows = [];
    for (const { id, value } of updates) rows.push(await writeField(id, value));
    return rows.map(toField);
  },
};

/**
 * Real rows are addressed by cuid. A field with no row yet is addressed by the
 * synthetic "TYPE:slug:key" id the read path hands out — writing it creates the
 * document and row from the seeded default's position.
 */
async function writeField(id: string, value: string) {
  if (!id.includes(":")) return prisma.contentField.update({ where: { id }, data: { value } });

  const [type, slug, ...rest] = id.split(":");
  const key = rest.join(":");
  const def = getDefaultDocument(type as ContentType, slug);
  const defField = def?.fields.find((field) => field.key === key);
  if (!def || !defField) throw new Error(`Unknown content field: ${id}`);

  const doc = await prisma.contentDocument.upsert({
    where: { type_slug: { type: def.type, slug: def.slug } },
    update: {},
    create: { type: def.type, slug: def.slug, title: def.title },
  });
  return prisma.contentField.upsert({
    where: { documentId_key: { documentId: doc.id, key } },
    update: { value },
    create: { documentId: doc.id, key, value, order: defField.order },
  });
}
