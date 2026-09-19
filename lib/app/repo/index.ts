/**
 * The only data-access surface for the app. Nothing outside this directory
 * touches Prisma directly. Which implementation backs it is decided once, at
 * first use, purely from whether DATABASE_URL is set — the Prisma module
 * (and lib/app/db/client's PrismaClient construction) is never even imported
 * on the in-memory path, so the app builds and runs with zero DB credentials.
 */
import type { Repo } from "./types";

let cached: Promise<Repo> | null = null;

async function loadRepo(): Promise<Repo> {
  if (process.env.DATABASE_URL) {
    const { prismaRepo } = await import("./prisma-repo");
    return prismaRepo;
  }
  const { memoryRepo } = await import("./memory-repo");
  return memoryRepo;
}

export function getRepo(): Promise<Repo> {
  if (!cached) cached = loadRepo();
  return cached;
}

export type { Repo, RepoUser, AppRole } from "./types";
