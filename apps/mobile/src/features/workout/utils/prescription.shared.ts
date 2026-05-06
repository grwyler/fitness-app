import type { ProgramWorkoutExerciseDto, UnitSystem, WeightValueDto, WorkoutSetTargetDto } from "@fitness/shared";
import { formatWeightForUser, parseWeightInputForUser } from "@fitness/shared";

export function normalizeRepTargetText(input: string) {
  const trimmed = input.trim().replace(/\s+/g, " ");
  const lower = trimmed.toLowerCase();

  if (lower === "amrap") {
    return "AMRAP";
  }

  if (lower === "failure" || lower === "to failure" || lower === "to-failure") {
    return "failure";
  }

  return trimmed;
}

export function parseRepTargetText(input: string): {
  repTargetText: string;
  targetReps: number | null;
  repRangeMin: number | null;
  repRangeMax: number | null;
} | null {
  const repTargetText = normalizeRepTargetText(input);
  if (!repTargetText) {
    return null;
  }

  const normalized = repTargetText.replace(/\s+/g, "");
  const rangeParts = normalized.split(/[-–]/);

  if (rangeParts.length === 1) {
    const reps = Number.parseInt(rangeParts[0] ?? "", 10);
    if (!Number.isFinite(reps) || reps <= 0) {
      return {
        repTargetText,
        targetReps: null,
        repRangeMin: null,
        repRangeMax: null
      };
    }

    return {
      repTargetText,
      targetReps: reps,
      repRangeMin: null,
      repRangeMax: null
    };
  }

  if (rangeParts.length !== 2) {
    return {
      repTargetText,
      targetReps: null,
      repRangeMin: null,
      repRangeMax: null
    };
  }

  const min = Number.parseInt(rangeParts[0] ?? "", 10);
  const max = Number.parseInt(rangeParts[1] ?? "", 10);
  if (!Number.isFinite(min) || !Number.isFinite(max) || min <= 0 || max <= 0 || max < min) {
    return null;
  }

  return {
    repTargetText: `${min}-${max}`,
    targetReps: min,
    repRangeMin: min,
    repRangeMax: max
  };
}

export function formatRepTargetFromExercise(exercise: ProgramWorkoutExerciseDto) {
  if (exercise.repTargetText && exercise.repTargetText.trim().length > 0) {
    return exercise.repTargetText.trim();
  }

  if (
    exercise.repRangeMin != null &&
    exercise.repRangeMax != null &&
    exercise.repRangeMax > exercise.repRangeMin
  ) {
    return `${exercise.repRangeMin}-${exercise.repRangeMax}`;
  }

  if (exercise.targetReps == null) {
    return "";
  }

  return String(exercise.targetReps);
}

export function formatWeightShort(input: { weight: WeightValueDto; unitSystem: UnitSystem }) {
  return formatWeightForUser({
    weightLbs: input.weight.value,
    unitSystem: input.unitSystem,
    includeUnit: true,
    maximumFractionDigits: input.unitSystem === "metric" ? 1 : 2
  }).text;
}

export function parseWeightDraft(input: { weightText: string; unitSystem: UnitSystem }) {
  return parseWeightInputForUser({
    weightText: input.weightText,
    unitSystem: input.unitSystem,
    maximumFractionDigits: input.unitSystem === "metric" ? 1 : 2
  });
}

export function buildCustomSetTargetsSummary(setTargets: WorkoutSetTargetDto[]) {
  const repTargets = setTargets
    .map((setTarget) => setTarget.repTargetText?.trim() ?? "")
    .filter(Boolean);

  if (repTargets.length !== setTargets.length) {
    return `${setTargets.length} custom sets`;
  }

  const allNumeric = repTargets.every((text) => /^\d+$/.test(text));
  if (allNumeric && repTargets.length <= 8) {
    return `${repTargets.join(" / ")} reps`;
  }

  return `${setTargets.length} custom sets`;
}

function isRepsModality(modality: ProgramWorkoutExerciseDto["loggingModality"]) {
  return modality === "reps_load" || modality === "reps_only";
}

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

export function formatExercisePrescriptionSummary(input: {
  exercise: ProgramWorkoutExerciseDto;
  unitSystem: UnitSystem;
}) {
  const exercise = input.exercise;
  const modality = exercise.loggingModality;

  const setTargets = exercise.setTargets ?? null;
  if (setTargets && setTargets.length > 0) {
    return isRepsModality(modality) ? buildCustomSetTargetsSummary(setTargets) : `${setTargets.length} custom sets`;
  }

  if (modality === "reps_load" || modality === "reps_only") {
    const repTarget = formatRepTargetFromExercise(exercise);
    const base = `${exercise.targetSets} \u00d7 ${repTarget || "reps"}`;
    const weight = exercise.targetWeight ? formatWeightShort({ weight: exercise.targetWeight, unitSystem: input.unitSystem }) : null;
    return weight ? `${base} \u00b7 ${weight}` : base;
  }

  if (modality === "time" || modality === "hold") {
    const duration =
      exercise.targetDurationSeconds != null ? formatDurationSecondsCompact(exercise.targetDurationSeconds) : null;
    return duration
      ? `${exercise.targetSets} \u00d7 ${duration}`
      : `${exercise.targetSets} set${exercise.targetSets === 1 ? "" : "s"}`;
  }

  if (modality === "time_distance") {
    const duration =
      exercise.targetDurationSeconds != null ? formatDurationSecondsCompact(exercise.targetDurationSeconds) : null;
    const distance =
      exercise.targetDistanceMeters != null ? formatDistanceCompact(exercise.targetDistanceMeters, input.unitSystem) : null;
    if (duration && distance) return `${distance} \u00b7 ${duration}`;
    if (distance) return distance;
    if (duration) return duration;
    return `${exercise.targetSets} set${exercise.targetSets === 1 ? "" : "s"}`;
  }

  if (modality === "distance") {
    const distance =
      exercise.targetDistanceMeters != null ? formatDistanceCompact(exercise.targetDistanceMeters, input.unitSystem) : null;
    return distance ?? `${exercise.targetSets} set${exercise.targetSets === 1 ? "" : "s"}`;
  }

  // interval
  const rounds = exercise.targetRounds ?? null;
  const duration =
    exercise.targetDurationSeconds != null ? formatDurationSecondsCompact(exercise.targetDurationSeconds) : null;

  if (rounds != null && duration) {
    return `${rounds} rounds \u00b7 ${duration}`;
  }

  if (rounds != null) {
    return `${rounds} rounds`;
  }

  return duration ?? `${exercise.targetSets} set${exercise.targetSets === 1 ? "" : "s"}`;
}

