import { formatWeightForUser, type UnitSystem } from "@fitness/shared";

export function formatExerciseTargetSummary(input: {
  targetSets: number;
  targetReps: number;
  repRangeMin?: number | null;
  repRangeMax?: number | null;
  targetWeightLbs: number;
  unitSystem: UnitSystem;
}) {
  const repRangeText =
    input.repRangeMin != null &&
    input.repRangeMax != null &&
    input.repRangeMax > input.repRangeMin
      ? `${input.repRangeMin}-${input.repRangeMax}`
      : null;

  return `${input.targetSets} x ${input.targetReps}${repRangeText ? ` (range ${repRangeText})` : ""} at ${formatWeightForUser({
    weightLbs: input.targetWeightLbs,
    unitSystem: input.unitSystem
  }).text}`;
}

