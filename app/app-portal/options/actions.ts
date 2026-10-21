"use server";

import { revalidatePath } from "next/cache";
import { getRepo } from "@/lib/app/repo";
import { requireRepSession } from "@/lib/app/auth/require-session";
import type { OptionInput, RepoOption } from "@/lib/app/repo/types";
import { validateOptionInput } from "@/lib/app/catalog/validate";

export type OptionActionResult = { ok: true; option: RepoOption } | { ok: false; error: string };

function revalidateOptions() {
  revalidatePath("/app-portal/options");
  revalidatePath("/app-portal/quotes", "layout");
}

export async function createOptionAction(input: OptionInput): Promise<OptionActionResult> {
  await requireRepSession();
  const validated = validateOptionInput(input);
  if (!validated.ok) return validated;

  const repo = await getRepo();
  const option = await repo.createOption(validated.value);
  revalidateOptions();
  return { ok: true, option };
}

export async function updateOptionAction(id: string, input: OptionInput): Promise<OptionActionResult> {
  await requireRepSession();
  const validated = validateOptionInput(input);
  if (!validated.ok) return validated;

  const repo = await getRepo();
  const option = await repo.updateOption(id, validated.value);
  if (!option) return { ok: false, error: "Option not found." };
  revalidateOptions();
  return { ok: true, option };
}

/** Soft deactivate/reactivate only — options are never deleted (quote lines reference them). */
export async function setOptionActiveAction(id: string, active: boolean): Promise<OptionActionResult> {
  await requireRepSession();

  const repo = await getRepo();
  const option = await repo.setOptionActive(id, active === true);
  if (!option) return { ok: false, error: "Option not found." };
  revalidateOptions();
  return { ok: true, option };
}
