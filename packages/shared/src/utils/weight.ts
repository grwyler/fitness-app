import type { UnitSystem } from "../domain/enums.js";

const KG_PER_LB = 0.45359237;

function roundTo(value: number, decimals: number) {
  const factor = Math.pow(10, decimals);
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function formatTrimmedNumber(value: number, maximumFractionDigits: number) {
  if (!Number.isFinite(value)) return "0";
  const rounded = roundTo(value, maximumFractionDigits);
  if (Number.isInteger(rounded)) return String(rounded);
  return rounded
    .toFixed(maximumFractionDigits)
    .replace(/0+$/, "")
    .replace(/\.$/, "");
}

export function lbsToKg(lbs: number) {
  return lbs * KG_PER_LB;
}

export function kgToLbs(kg: number) {
  return kg / KG_PER_LB;
}

export function formatWeightForUser(input: {
  weightLbs: number;
  unitSystem: UnitSystem;
  includeUnit?: boolean;
  maximumFractionDigits?: number;
  useGrouping?: boolean;
}) {
  const unit = input.unitSystem === "metric" ? "kg" : "lb";
  const rawValue = input.unitSystem === "metric" ? lbsToKg(input.weightLbs) : input.weightLbs;

  const maximumFractionDigits = input.maximumFractionDigits ?? (input.unitSystem === "metric" ? 1 : 2);
  const value = roundTo(rawValue, maximumFractionDigits);

  const includeUnit = input.includeUnit ?? true;
  const useGrouping = input.useGrouping ?? false;

  const formattedNumber = useGrouping
    ? value.toLocaleString(undefined, { maximumFractionDigits })
    : formatTrimmedNumber(value, maximumFractionDigits);

  return {
    value,
    unit,
    text: includeUnit ? `${formattedNumber} ${unit}` : formattedNumber
  };
}

export function parseWeightInputForUser(input: {
  weightText: string;
  unitSystem: UnitSystem;
  maximumFractionDigits?: number;
}) {
  const trimmed = input.weightText.trim();
  if (!trimmed) return null;

  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) return null;

  const maxDigits = input.maximumFractionDigits ?? (input.unitSystem === "metric" ? 1 : 2);
  const userValue = roundTo(parsed, maxDigits);
  if (userValue < 0) return null;

  const weightLbs = input.unitSystem === "metric" ? kgToLbs(userValue) : userValue;
  return roundTo(weightLbs, 2);
}

