import { formatWeightForUser, type ExerciseLoggingModality, type UnitSystem } from "@fitness/shared";

function formatDurationSecondsCompact(seconds: number) {
  const safe = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safe / 60);
  const remaining = safe % 60;
  return `${minutes}:${remaining.toString().padStart(2, "0")}`;
}

function formatDistanceCompact(distanceMeters: number, unitSystem: UnitSystem) {
  if (!Number.isFinite(distanceMeters) || distanceMeters < 0) {
    return null;
  }

  const value = unitSystem === "metric" ? distanceMeters / 1000 : distanceMeters / 1609.344;
  const unit = unitSystem === "metric" ? "km" : "mi";
  const text = value.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
  return `${text} ${unit}`;
}

export function formatExerciseTargetSummary(input: {
  modality: ExerciseLoggingModality;
  targetSets: number;
  targetReps: number | null;
  repRangeMin?: number | null;
  repRangeMax?: number | null;
  targetWeightLbs: number | null;
  targetDurationSeconds?: number | null;
  targetDistanceMeters?: number | null;
  targetRounds?: number | null;
  unitSystem: UnitSystem;
}) {
  if (input.modality === "reps_load") {
    const repRangeText =
      input.repRangeMin != null &&
      input.repRangeMax != null &&
      input.repRangeMax > input.repRangeMin
        ? `${input.repRangeMin}-${input.repRangeMax}`
        : null;

    const targetRepsText = input.targetReps ?? 0;
    const targetWeightText = formatWeightForUser({
      weightLbs: input.targetWeightLbs ?? 0,
      unitSystem: input.unitSystem
    }).text;

    return `${input.targetSets} x ${targetRepsText}${repRangeText ? ` (range ${repRangeText})` : ""} at ${targetWeightText}`;
  }

  if (input.modality === "reps_only") {
    const repsText = input.targetReps != null ? `${input.targetReps} reps` : "reps";
    const loadText =
      input.targetWeightLbs != null && input.targetWeightLbs > 0
        ? ` @ ${formatWeightForUser({ weightLbs: input.targetWeightLbs, unitSystem: input.unitSystem }).text}`
        : "";
    return `${input.targetSets} x ${repsText}${loadText}`;
  }

  if (input.modality === "time" || input.modality === "hold") {
    const duration = input.targetDurationSeconds != null ? formatDurationSecondsCompact(input.targetDurationSeconds) : null;
    return duration ? `${input.targetSets} x ${duration}` : `${input.targetSets} set${input.targetSets === 1 ? "" : "s"}`;
  }

  if (input.modality === "time_distance") {
    const duration = input.targetDurationSeconds != null ? formatDurationSecondsCompact(input.targetDurationSeconds) : null;
    const distance = input.targetDistanceMeters != null ? formatDistanceCompact(input.targetDistanceMeters, input.unitSystem) : null;
    if (duration && distance) return `${duration} · ${distance}`;
    if (duration) return duration;
    if (distance) return distance;
    return `${input.targetSets} set${input.targetSets === 1 ? "" : "s"}`;
  }

  if (input.modality === "distance") {
    const distance = input.targetDistanceMeters != null ? formatDistanceCompact(input.targetDistanceMeters, input.unitSystem) : null;
    return distance ?? `${input.targetSets} set${input.targetSets === 1 ? "" : "s"}`;
  }

  // interval
  if (input.targetRounds != null) {
    return `${input.targetRounds} rounds`;
  }

  return `${input.targetSets} set${input.targetSets === 1 ? "" : "s"}`;
}
