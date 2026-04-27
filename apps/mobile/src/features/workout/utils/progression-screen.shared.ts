import type { ProgressionSummaryDto } from "@fitness/shared";

export function formatProgressionWeight(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return "No weight yet";
  }

  return `${value.toLocaleString(undefined, { maximumFractionDigits: 1 })} lb`;
}

export function formatProgressionVolume(value: number) {
  return `${value.toLocaleString(undefined, { maximumFractionDigits: 0 })} lb`;
}

export function getProgressionEmptyState(summary: ProgressionSummaryDto | null | undefined) {
  return !summary || summary.totalCompletedWorkouts === 0;
}

