import { normalizedCatalogSeed } from "@/lib/app/catalog/normalized-seed";
import { normalizedOptionSeed } from "@/lib/app/options/normalized-seed";
import type { RepoCatalogItem, RepoJob, RepoOption, RepoQuoteDetail, RepoUser } from "./types";

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

function seedOptions(catalogItems: RepoCatalogItem[]): RepoOption[] {
  return normalizedOptionSeed.map((option) => ({
    id: `option-${option.key}`,
    name: option.name,
    customerDescription: option.customerDescription,
    inputType: option.inputType,
    defaultUnitPrice: option.defaultUnitPrice,
    laborPerUnit: option.laborPerUnit,
    active: true,
    components: option.components.map((component) => {
      const catalogItem = catalogItems.find((item) => item.sourceId === component.catalogSourceId);
      if (!catalogItem) {
        throw new Error(
          `Option "${option.name}" references unknown catalog sourceId ${component.catalogSourceId}`,
        );
      }
      return {
        id: `option-component-${option.key}-${component.catalogSourceId}`,
        catalogItemId: catalogItem.id,
        catalogItemName: catalogItem.name,
        qtyPerUnit: component.qtyPerUnit,
      };
    }),
  }));
}

const catalogItems = seedCatalogItems();

export const memoryStore = {
  users: seedAdminUser(),
  catalogItems,
  options: seedOptions(catalogItems),
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
