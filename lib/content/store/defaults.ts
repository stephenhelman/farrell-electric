/**
 * Seeded defaults for the content store, flattened from content/*.json. The one
 * flatten function behind the seed script, the in-memory store and the
 * per-field fallback. Pure — no Prisma, no I/O.
 *
 * Scalars only. Skipped on purpose: nulls (the default supplies null),
 * `serviceIds` (references into the services collection), `financing.hasTerms`/
 * `terms`, and `process.N.step` (derived from position). projects.json and
 * services.json are collections and never enter the store.
 */
import copyData from "@/content/copy.json";
import legalData from "@/content/legal.json";
import type { CopyDocument, LegalDocument, LegalPageSlug, PageSlug } from "../types";
import type { ContentType, DefaultDocument } from "./types";

const copy = copyData as unknown as CopyDocument;
const legal = legalData as unknown as LegalDocument;

const SKIPPED_KEYS = new Set(["serviceIds", "hasTerms", "terms", "step"]);

function flatten(value: unknown, path: string, out: [string, string][]): void {
  if (value === null || value === undefined) return;
  if (typeof value === "string") {
    out.push([path, value]);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => flatten(item, path ? `${path}.${index}` : String(index), out));
    return;
  }
  if (typeof value === "object") {
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      if (SKIPPED_KEYS.has(key)) continue;
      // `slug` lives on the document, not as a field.
      if (key === "slug" && path === "") continue;
      flatten(child, path ? `${path}.${key}` : key, out);
    }
  }
  // Numbers/booleans are structural, not copy — not stored.
}

function toDocument(type: ContentType, slug: string, title: string, source: unknown): DefaultDocument {
  const pairs: [string, string][] = [];
  flatten(source, "", pairs);
  return { type, slug, title, fields: pairs.map(([key, value], order) => ({ key, value, order })) };
}

const PAGE_TITLES: Record<PageSlug, string> = {
  "landscape-lighting": "Landscape Lighting",
  "permanent-lighting": "Permanent Lighting",
  "outdoor-lighting": "Outdoor Lighting",
  "electrical-services": "Electrical Services",
  "residential-electrician": "Residential Electrician",
  "commercial-electrician": "Commercial Electrician",
  "electrical-service-calls": "Electrical Service Calls",
  about: "About",
};

function buildDefaults(): DefaultDocument[] {
  const docs: DefaultDocument[] = [
    toDocument("SITE_SETTINGS", "", "Site settings", copy.siteSettings),
    toDocument("HOME", "", "Home", copy.home),
  ];
  for (const slug of Object.keys(PAGE_TITLES) as PageSlug[]) {
    docs.push(toDocument("PAGE", slug, PAGE_TITLES[slug], copy.pages[slug]));
  }
  docs.push(toDocument("FINANCING", "", "Financing", copy.financing));
  for (const slug of Object.keys(legal) as LegalPageSlug[]) {
    docs.push(toDocument("LEGAL", slug, legal[slug].title, legal[slug]));
  }
  return docs;
}

let cached: DefaultDocument[] | null = null;

export function getDefaultDocuments(): DefaultDocument[] {
  if (!cached) cached = buildDefaults();
  return cached;
}

export function getDefaultDocument(type: ContentType, slug = ""): DefaultDocument | undefined {
  return getDefaultDocuments().find((doc) => doc.type === type && doc.slug === slug);
}
