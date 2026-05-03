import { formatWeightForUser, type ProgressionSummaryDto, type UnitSystem, type WorkoutSessionDto } from "@fitness/shared";

export type ExerciseProgressHighlight = {
  exerciseEntryId: string;
  text: string;
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
