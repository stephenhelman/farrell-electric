/**
 * Content-layer seam, mirroring lib/app/repo/getRepo(): the implementation is
 * picked once, from DATABASE_URL, by dynamic import — so the Prisma module is
 * never loaded on the in-memory path. Deliberately a separate seam from the
 * quote repo.
 */
import type { ContentStore } from "./types";

let cached: Promise<ContentStore> | null = null;

async function loadStore(): Promise<ContentStore> {
  if (process.env.DATABASE_URL) {
    const { prismaContentStore } = await import("./prisma-store");
    return prismaContentStore;
  }
  const { memoryContentStore } = await import("./memory-store");
  return memoryContentStore;
}

export function getContentStore(): Promise<ContentStore> {
  if (!cached) cached = loadStore();
  return cached;
}

export type {
  ContentStore,
  ContentType,
  ContentDocumentRecord,
  ContentDocumentSummary,
  ContentFieldRecord,
} from "./types";
