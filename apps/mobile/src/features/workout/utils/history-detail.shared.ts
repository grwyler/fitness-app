import type { ProgressionSummaryDto, WorkoutSessionDto } from "@fitness/shared";

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

function formatDelta(value: number) {
  return Number.isInteger(value) ? value.toString() : value.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
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
        text: `+${formatDelta(delta)} lb from last time`
      }
    ];
  });
}
