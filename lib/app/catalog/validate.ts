import type { CatalogItemInput, OptionInput } from "@/lib/app/repo/types";
import type { CalcType, UnitOfMeasure } from "./normalized-seed";
import type { OptionInputType } from "@/lib/app/options/normalized-seed";

export const UNITS_OF_MEASURE: readonly UnitOfMeasure[] = ["EACH", "LINEAR_FT", "HOUR", "JOB"];

export const CALC_TYPES: readonly CalcType[] = [
  "UPLIGHT", "PATH", "WELL", "WALL_WASH", "ACCENT", "UNDERWATER", "DECK", "TRANSFORMER",
  "WIRE", "TIMER", "HOLIDAY", "SERVICE", "LABOR", "MATERIAL", "DOWNLIGHT", "OTHER",
];

export const OPTION_INPUT_TYPES: readonly OptionInputType[] = ["COUNT", "LINEAR_FT", "AREA", "BOOLEAN"];

export const PRICE_BOOK_LIMITS = {
  name: 200,
  description: 2000,
  reviewNotes: 2000,
  amountMax: 1_000_000,
  wattageMax: 100_000,
} as const;

export type Validated<T> = { ok: true; value: T } | { ok: false; error: string };

function money(value: unknown, label: string): Validated<number> {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > PRICE_BOOK_LIMITS.amountMax) {
    return { ok: false, error: `${label} must be a number of 0 or more.` };
  }
  return { ok: true, value: Math.round(value * 100) / 100 };
}

function optionalMoney(value: unknown, label: string): Validated<number | null> {
  return value === null ? { ok: true, value: null } : money(value, label);
}

function optionalText(value: unknown, label: string, max: number): Validated<string | null> {
  if (value === null || value === undefined) return { ok: true, value: null };
  if (typeof value !== "string") return { ok: false, error: `${label} is invalid.` };
  const trimmed = value.trim();
  if (trimmed.length > max) return { ok: false, error: `${label} is too long.` };
  return { ok: true, value: trimmed === "" ? null : trimmed };
}

function requiredText(value: unknown, label: string, max: number): Validated<string> {
  if (typeof value !== "string" || value.trim() === "") return { ok: false, error: `${label} is required.` };
  if (value.trim().length > max) return { ok: false, error: `${label} is too long.` };
  return { ok: true, value: value.trim() };
}

/** Server-side validation of untrusted catalog form input — the client form is not trusted. */
export function validateCatalogItemInput(input: CatalogItemInput): Validated<CatalogItemInput> {
  const name = requiredText(input?.name, "Name", PRICE_BOOK_LIMITS.name);
  if (!name.ok) return name;
  const description = optionalText(input.description, "Description", PRICE_BOOK_LIMITS.description);
  if (!description.ok) return description;
  const reviewNotes = optionalText(input.reviewNotes, "Review notes", PRICE_BOOK_LIMITS.reviewNotes);
  if (!reviewNotes.ok) return reviewNotes;
  const price = money(input.price, "Price");
  if (!price.ok) return price;
  const cost = money(input.cost, "Cost");
  if (!cost.ok) return cost;

  if (!UNITS_OF_MEASURE.includes(input.unitOfMeasure)) return { ok: false, error: "Choose a unit of measure." };
  if (!CALC_TYPES.includes(input.calcType)) return { ok: false, error: "Choose a category." };

  let wattage: number | null = null;
  if (input.wattage !== null) {
    if (typeof input.wattage !== "number" || !Number.isFinite(input.wattage) || input.wattage <= 0 || input.wattage > PRICE_BOOK_LIMITS.wattageMax) {
      return { ok: false, error: "Wattage must be a positive number, or left blank." };
    }
    wattage = input.wattage;
  }

  return {
    ok: true,
    value: {
      name: name.value,
      description: description.value,
      unitOfMeasure: input.unitOfMeasure,
      calcType: input.calcType,
      wattage,
      price: price.value,
      cost: cost.value,
      taxable: input.taxable === true,
      isPlaceholder: input.isPlaceholder === true,
      isSuspectedDuplicate: input.isSuspectedDuplicate === true,
      needsReview: input.needsReview === true,
      reviewNotes: reviewNotes.value,
    },
  };
}

export function validateOptionInput(input: OptionInput): Validated<OptionInput> {
  const name = requiredText(input?.name, "Name", PRICE_BOOK_LIMITS.name);
  if (!name.ok) return name;
  const customerDescription = requiredText(input.customerDescription, "Customer description", PRICE_BOOK_LIMITS.description);
  if (!customerDescription.ok) return customerDescription;
  if (!OPTION_INPUT_TYPES.includes(input.inputType)) return { ok: false, error: "Choose an input type." };
  const defaultUnitPrice = optionalMoney(input.defaultUnitPrice, "Default unit price");
  if (!defaultUnitPrice.ok) return defaultUnitPrice;
  const laborPerUnit = optionalMoney(input.laborPerUnit, "Labor per unit");
  if (!laborPerUnit.ok) return laborPerUnit;

  return {
    ok: true,
    value: {
      name: name.value,
      customerDescription: customerDescription.value,
      inputType: input.inputType,
      defaultUnitPrice: defaultUnitPrice.value,
      laborPerUnit: laborPerUnit.value,
    },
  };
}
