import type { CalcType, UnitOfMeasure } from "./normalized-seed";

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
