import { PrismaClient } from "@prisma/client";

/**
 * Global singleton — the standard Next.js pattern to avoid exhausting
 * connections from hot-reloaded module instances in dev. Only ever imported
 * from lib/app/repo/prisma-repo.ts, and only when DATABASE_URL is set.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
