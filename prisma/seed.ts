import { PrismaClient } from "@prisma/client";
import { normalizedCatalogSeed } from "../lib/app/catalog/normalized-seed";

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
async function seedCatalog() {
  for (const item of normalizedCatalogSeed) {
    await prisma.catalogItem.upsert({
      where: { sourceId: item.sourceId },
      update: { ...item },
      create: { ...item },
    });
  }
  console.log(`[seed] Catalog ensured: ${normalizedCatalogSeed.length} items.`);
}

async function main() {
  await seedAdminUser();
  await seedCatalog();
}

main()
  .catch((error) => {
    console.error("[seed] failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
