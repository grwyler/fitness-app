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

export function formatExercisePrescriptionSummary(input: {
  exercise: ProgramWorkoutExerciseDto;
  unitSystem: UnitSystem;
}) {
  const setTargets = input.exercise.setTargets ?? null;
  if (setTargets && setTargets.length > 0) {
    return buildCustomSetTargetsSummary(setTargets);
  }

  const repTarget = formatRepTargetFromExercise(input.exercise);
  const base = `${input.exercise.targetSets} \u00d7 ${repTarget}`;
  const weight = input.exercise.targetWeight ? formatWeightShort({ weight: input.exercise.targetWeight, unitSystem: input.unitSystem }) : null;

  return weight ? `${base} \u00b7 ${weight}` : base;
}

