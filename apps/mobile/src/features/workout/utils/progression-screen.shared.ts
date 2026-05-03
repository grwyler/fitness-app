import { formatWeightForUser, type ProgressionSummaryDto, type UnitSystem } from "@fitness/shared";

export function formatProgressionWeight(value: number | null | undefined, unitSystem?: UnitSystem) {
  if (value === null || value === undefined) {
    return "No weight yet";
  }

  return formatWeightForUser({
    weightLbs: value,
    unitSystem: unitSystem ?? "imperial",
    maximumFractionDigits: 1,
    useGrouping: true
  }).text;
}

export function formatProgressionVolume(value: number, unitSystem?: UnitSystem) {
  return formatWeightForUser({
    weightLbs: value,
    unitSystem: unitSystem ?? "imperial",
    maximumFractionDigits: 0,
    useGrouping: true
  }).text;
}

export function getProgressionEmptyState(summary: ProgressionSummaryDto | null | undefined) {
  return !summary || summary.totalCompletedWorkouts === 0;
}
