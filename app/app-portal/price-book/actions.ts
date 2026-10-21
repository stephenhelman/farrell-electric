"use server";

import { revalidatePath } from "next/cache";
import { getRepo } from "@/lib/app/repo";
import { requireRepSession } from "@/lib/app/auth/require-session";
import type { CatalogItemInput, RepoCatalogItem } from "@/lib/app/repo/types";
import { validateCatalogItemInput } from "@/lib/app/catalog/validate";

export type CatalogActionResult = { ok: true; item: RepoCatalogItem } | { ok: false; error: string };

// Catalog edits change what the quote picker and estimator offer.
function revalidateCatalog() {
  revalidatePath("/app-portal/price-book");
  revalidatePath("/app-portal/options");
  revalidatePath("/app-portal/quotes", "layout");
}

export async function createCatalogItemAction(input: CatalogItemInput): Promise<CatalogActionResult> {
  await requireRepSession();
  const validated = validateCatalogItemInput(input);
  if (!validated.ok) return validated;

  const repo = await getRepo();
  const item = await repo.createCatalogItem(validated.value);
  revalidateCatalog();
  return { ok: true, item };
}

export async function updateCatalogItemAction(id: string, input: CatalogItemInput): Promise<CatalogActionResult> {
  await requireRepSession();
  const validated = validateCatalogItemInput(input);
  if (!validated.ok) return validated;

  const repo = await getRepo();
  const item = await repo.updateCatalogItem(id, validated.value);
  if (!item) return { ok: false, error: "Item not found." };
  revalidateCatalog();
  return { ok: true, item };
}

/** Soft deactivate/reactivate only — catalog rows are never deleted (quotes reference them). */
export async function setCatalogItemActiveAction(id: string, active: boolean): Promise<CatalogActionResult> {
  await requireRepSession();

  const repo = await getRepo();
  const item = await repo.setCatalogItemActive(id, active === true);
  if (!item) return { ok: false, error: "Item not found." };
  revalidateCatalog();
  return { ok: true, item };
}
