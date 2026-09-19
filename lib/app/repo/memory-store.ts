import { normalizedCatalogSeed } from "@/lib/app/catalog/normalized-seed";
import type { RepoCatalogItem, RepoJob, RepoQuoteDetail, RepoUser } from "./types";

/**
 * Seeds the same admin identity the Prisma seed script (prisma/seed.ts)
 * writes to a real database, from the same ADMIN_EMAIL / ADMIN_PASSWORD_HASH
 * env vars — so login behaves identically with or without DATABASE_URL set.
 */
function seedAdminUser(): RepoUser[] {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const passwordHash = process.env.ADMIN_PASSWORD_HASH;
  if (!email || !passwordHash) return [];

  return [{ id: "admin-seed", email, passwordHash, name: "Owner", role: "OWNER" }];
}

function seedCatalogItems(): RepoCatalogItem[] {
  return normalizedCatalogSeed.map((item) => ({ id: `catalog-${item.sourceId}`, ...item }));
}

export const memoryStore = {
  users: seedAdminUser(),
  catalogItems: seedCatalogItems(),
  // Quotes/jobs have no seed data — they're created through the builder.
  // This array is the entire "database" on the in-memory path: it does not
  // survive a process restart, which is expected until DATABASE_URL is set.
  quotes: [] as RepoQuoteDetail[],
  jobs: [] as RepoJob[],
};

export function nextQuoteNumber(): number {
  const max = memoryStore.quotes.reduce((highest, quote) => Math.max(highest, quote.number), 1000);
  return max + 1;
}
