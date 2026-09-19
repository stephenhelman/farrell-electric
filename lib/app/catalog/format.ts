import type { CalcType, UnitOfMeasure } from "./normalized-seed";
import type { OptionInputType } from "@/lib/app/options/normalized-seed";

function titleCase(value: string): string {
  return value
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function formatCalcType(calcType: CalcType): string {
  return titleCase(calcType);
}

export function formatUnitOfMeasure(unit: UnitOfMeasure): string {
  if (unit === "LINEAR_FT") return "Linear Ft";
  return titleCase(unit);
}

export function formatOptionInputType(inputType: OptionInputType): string {
  if (inputType === "LINEAR_FT") return "Linear Ft";
  return titleCase(inputType);
}
