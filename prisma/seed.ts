import { PrismaClient } from "@prisma/client";
import { normalizedCatalogSeed } from "../lib/app/catalog/normalized-seed";
import { normalizedOptionSeed } from "../lib/app/options/normalized-seed";

const prisma = new PrismaClient();

/**
 * Idempotent — safe to run on every deploy. Ensures the admin User row
 * matches the current ADMIN_EMAIL / ADMIN_PASSWORD_HASH env vars without
 * duplicating or erroring on repeat runs.
 */
async function seedAdminUser() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const passwordHash = process.env.ADMIN_PASSWORD_HASH;

  if (!email || !passwordHash) {
    console.log("[seed] ADMIN_EMAIL / ADMIN_PASSWORD_HASH not set — skipping admin user seed.");
    return;
  }

  const user = await prisma.user.upsert({
    where: { email },
    update: { passwordHash, role: "OWNER" },
    create: { email, passwordHash, name: "Owner", role: "OWNER" },
  });

  console.log(`[seed] Admin user ensured: ${user.email}`);
}

/**
 * Idempotent via upsert on the unique sourceId — re-running converges the
 * catalog to normalizedCatalogSeed's current contents rather than
 * duplicating rows.
 */
/**
 * sourceId 7 was merged into sourceId 6 (confirmed duplicate WAC Colorscaping
 * Grand Accent 24W entries) and no longer appears in normalizedCatalogSeed.
 * Upsert alone never deletes rows, so remove it explicitly on a database
 * that still has it from an earlier seed run.
 */
async function pruneMergedCatalogItems() {
  const merged = await prisma.catalogItem.findUnique({ where: { sourceId: 7 } });
  if (!merged) return;

  const [optionComponents, quoteLineItems] = await Promise.all([
    prisma.optionComponent.count({ where: { catalogItemId: merged.id } }),
    prisma.quoteLineItem.count({ where: { catalogItemId: merged.id } }),
  ]);
  if (optionComponents > 0 || quoteLineItems > 0) {
    throw new Error(
      `[seed] Refusing to remove merged catalog item sourceId 7 — it still has ${optionComponents} option component(s) and ${quoteLineItems} quote line item(s) referencing it.`,
    );
  }

  await prisma.catalogItem.delete({ where: { sourceId: 7 } });
  console.log("[seed] Removed merged catalog item sourceId 7 (duplicate of sourceId 6).");
}

async function seedCatalog() {
  await pruneMergedCatalogItems();
  for (const item of normalizedCatalogSeed) {
    await prisma.catalogItem.upsert({
      where: { sourceId: item.sourceId },
      update: { ...item },
      create: { ...item },
    });
  }
  console.log(`[seed] Catalog ensured: ${normalizedCatalogSeed.length} items.`);
}

/**
 * Option has no natural unique key beyond id, so this matches on name rather
 * than upserting — good enough for a handful of hand-authored seed options.
 * Components are replaced wholesale on each run rather than diffed, same
 * "simplest correct" approach the repo layer uses for quote line items.
 */
async function seedOptions() {
  for (const option of normalizedOptionSeed) {
    const componentsData = await Promise.all(
      option.components.map(async (component) => {
        const catalogItem = await prisma.catalogItem.findUniqueOrThrow({
          where: { sourceId: component.catalogSourceId },
        });
        return { catalogItemId: catalogItem.id, qtyPerUnit: component.qtyPerUnit };
      }),
    );

    const existing = await prisma.option.findFirst({ where: { name: option.name } });

    const data = {
      name: option.name,
      customerDescription: option.customerDescription,
      inputType: option.inputType,
      defaultUnitPrice: option.defaultUnitPrice,
      laborPerUnit: option.laborPerUnit,
    };

    if (existing) {
      await prisma.optionComponent.deleteMany({ where: { optionId: existing.id } });
      await prisma.option.update({
        where: { id: existing.id },
        data: { ...data, components: { create: componentsData } },
      });
    } else {
      await prisma.option.create({ data: { ...data, components: { create: componentsData } } });
    }
  }
  console.log(`[seed] Options ensured: ${normalizedOptionSeed.length} options.`);
}

async function main() {
  await seedAdminUser();
  await seedCatalog();
  await seedOptions();
}

main()
  .catch((error) => {
    console.error("[seed] failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
