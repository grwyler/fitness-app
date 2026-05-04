import { formatWeightForUser, type ProgressionSummaryDto, type UnitSystem, type WorkoutSessionDto } from "@fitness/shared";

export type ExerciseProgressHighlight = {
  exerciseEntryId: string;
  text: string;
};

export type UnusualWorkoutPerformanceItem = {
  exerciseEntryId: string;
  exerciseName: string;
  title: string;
  message: string;
  evidence: string[];
};

export type WorkoutDetailStats = {
  completedSetCount: number;
  failedSetCount: number;
  plannedSetCount: number;
  totalVolume: number;
};

function resolveUnitSystem(unitSystem: UnitSystem | undefined) {
  return unitSystem ?? "imperial";
}

function formatDeltaWeightText(deltaLbs: number, unitSystem: UnitSystem | undefined) {
  const resolved = resolveUnitSystem(unitSystem);
  const unit = resolved === "metric" ? "kg" : "lb";
  const numeric = formatWeightForUser({
    weightLbs: Math.abs(deltaLbs),
    unitSystem: resolved,
    includeUnit: false,
    maximumFractionDigits: resolved === "metric" ? 1 : 2
  }).text;
  return `+${numeric} ${unit}`;
}

function formatWeightText(weightLbs: number, unitSystem: UnitSystem | undefined, options?: { maximumFractionDigits?: number }) {
  return formatWeightForUser({
    weightLbs,
    unitSystem: resolveUnitSystem(unitSystem),
    maximumFractionDigits: options?.maximumFractionDigits ?? 1
  }).text;
}

function formatRatio(value: number) {
  if (!Number.isFinite(value) || value <= 0) {
    return null;
  }

  if (value >= 10) {
    return `${Math.round(value)}×`;
  }

  return `${Math.round(value * 10) / 10}×`;
}

function isWeightCloseToTarget(actualWeightLbs: number, targetWeightLbs: number) {
  if (targetWeightLbs <= 0) {
    return false;
  }

  const tolerance = Math.max(targetWeightLbs * 0.02, 0.5);
  return Math.abs(actualWeightLbs - targetWeightLbs) <= tolerance;
}

export function getCompletedSetVolume(input: {
  actualReps: number | null;
  actualWeight?: { value: number } | null;
  status: string;
  targetWeight: { value: number };
}) {
  if (input.status !== "completed" && input.status !== "failed") {
    return 0;
  }

  return (input.actualReps ?? 0) * (input.actualWeight?.value ?? input.targetWeight.value);
}

export function getWorkoutDetailStats(workout: WorkoutSessionDto): WorkoutDetailStats {
  const sets = workout.exercises.flatMap((exercise) => exercise.sets);

  return {
    completedSetCount: sets.filter((set) => set.status === "completed").length,
    failedSetCount: sets.filter((set) => set.status === "failed").length,
    plannedSetCount: sets.length,
    totalVolume: sets.reduce((sum, set) => sum + getCompletedSetVolume(set), 0)
  };
}

export function getUnusualWorkoutPerformanceItems(input: { workout: WorkoutSessionDto; unitSystem?: UnitSystem }): UnusualWorkoutPerformanceItem[] {
  return input.workout.exercises.flatMap((exercise) => {
    const completedSets = exercise.sets.filter((set) => set.status === "completed" || set.status === "failed");
    const bestSet = [...completedSets].sort((left, right) => (right.actualReps ?? 0) - (left.actualReps ?? 0))[0] ?? null;
    const bestReps = bestSet?.actualReps ?? null;
    const targetReps = exercise.targetReps;

    if (!bestReps || targetReps <= 0) {
      return [];
    }

    const ratio = bestReps / targetReps;
    const isExtreme = bestReps >= Math.max(targetReps * 5, targetReps + 20);
    if (!isExtreme) {
      return [];
    }

    const bestWeight = bestSet?.actualWeight?.value ?? null;
    const targetWeight = exercise.targetWeight.value;
    if (bestWeight == null || !isWeightCloseToTarget(bestWeight, targetWeight)) {
      return [];
    }

    const ratioText = formatRatio(ratio);
    const evidence = [
      `Prescribed: ${targetReps} reps at ${formatWeightText(targetWeight, input.unitSystem)}`,
      `Logged best: ${bestReps} reps at ${formatWeightText(bestWeight, input.unitSystem)}`,
      ratioText ? `That's ${ratioText} the target reps` : null
    ].filter((line): line is string => Boolean(line));

    return [
      {
        exerciseEntryId: exercise.id,
        exerciseName: exercise.exerciseName,
        title: "Unusual performance detected",
        message:
          "You completed far more reps than prescribed. This usually means the weight is too light, the starting point needs recalibration, or the log may need review.",
        evidence
      }
    ];
  });
}

export function buildWorkoutDetailProgressHighlights(input: {
  workout: WorkoutSessionDto;
  progression: ProgressionSummaryDto | null | undefined;
  unitSystem?: UnitSystem;
}): ExerciseProgressHighlight[] {
  if (!input.progression) {
    return [];
  }

  return input.workout.exercises.flatMap((exercise) => {
    const progressionExercise = input.progression?.exercises.find(
      (candidate) => candidate.exerciseId === exercise.exerciseId
    );
    const currentPoint = progressionExercise?.points.find(
      (point) => point.workoutSessionId === input.workout.id
    );

    if (!progressionExercise || !currentPoint) {
      return [];
    }

    const previousPoint =
      [...progressionExercise.points]
        .filter((point) => point.completedAt < currentPoint.completedAt)
        .sort((left, right) => right.completedAt.localeCompare(left.completedAt))[0] ?? null;

    if (!previousPoint?.bestWeight?.value || !currentPoint.bestWeight?.value) {
      return [];
    }

    const delta = currentPoint.bestWeight.value - previousPoint.bestWeight.value;
    if (delta <= 0) {
      return [];
    }

    return [
      {
        exerciseEntryId: exercise.id,
        text: `${formatDeltaWeightText(delta, input.unitSystem)} from last time`
      }
    ];
  });
}
