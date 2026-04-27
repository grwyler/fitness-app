import type { CompleteWorkoutSessionResponse, WorkoutSessionDto } from "@fitness/shared";

export type WorkoutSummaryStats = {
  completedExerciseCount: number;
  completedSetCount: number;
  exerciseCount: number;
  failedSetCount: number;
  plannedSetCount: number;
  totalVolume: number;
  durationMinutes: number | null;
};

export type WorkoutSummaryOutcome = {
  label: string;
  value: string;
  detail: string;
};

function formatDelta(value: number) {
  return Number.isInteger(value) ? value.toString() : value.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
}

function formatNumber(value: number) {
  return Math.round(value).toLocaleString();
}

export function getWorkoutSummaryStats(workout: WorkoutSessionDto): WorkoutSummaryStats {
  const sets = workout.exercises.flatMap((exercise) => exercise.sets);
  const completedSets = sets.filter((set) => set.status === "completed");
  const failedSets = sets.filter((set) => set.status === "failed");
  const totalVolume = sets.reduce((sum, set) => {
    if (set.status !== "completed" && set.status !== "failed") {
      return sum;
    }

    const reps = set.actualReps ?? 0;
    const weight = set.actualWeight?.value ?? set.targetWeight.value;
    return sum + reps * weight;
  }, 0);

  return {
    completedExerciseCount: workout.exercises.filter((exercise) =>
      exercise.sets.length > 0 && exercise.sets.every((set) => set.status !== "pending")
    ).length,
    completedSetCount: completedSets.length,
    exerciseCount: workout.exercises.length,
    failedSetCount: failedSets.length,
    plannedSetCount: sets.length,
    totalVolume,
    durationMinutes: workout.durationSeconds ? Math.max(1, Math.round(workout.durationSeconds / 60)) : null
  };
}

export function getWorkoutSummaryHeadline(summary: CompleteWorkoutSessionResponse) {
  const updates = summary.progressionUpdates.filter((update) => update.result === "increased");

  if (updates.length > 0) {
    return `${updates.length} lift${updates.length === 1 ? "" : "s"} moving up next time`;
  }

  if (summary.workoutSession.isPartial) {
    return "Workout saved";
  }

  return "Nice work. Workout saved.";
}

export function getWorkoutSummaryEncouragement(summary: CompleteWorkoutSessionResponse) {
  const increasedUpdates = summary.progressionUpdates.filter((update) => update.result === "increased");

  if (increasedUpdates.length > 0) {
    const firstUpdate = increasedUpdates[0];
    if (firstUpdate) {
      return `${firstUpdate.exerciseName} moves to ${firstUpdate.nextWeight.value} lb next time.`;
    }
  }

  const metricText = summary.progressMetrics.find((metric) => metric.displayText)?.displayText;
  if (metricText) {
    return metricText;
  }

  if (summary.workoutSession.isPartial) {
    return "Saved. You still showed up and logged the work.";
  }

  return "That one is in the books.";
}

export function getProgressionUpdateSummaryText(update: CompleteWorkoutSessionResponse["progressionUpdates"][number]) {
  const previousWeight = update.previousWeight.value;
  const nextWeight = update.nextWeight.value;
  const delta = nextWeight - previousWeight;

  if (update.result === "increased" && delta > 0) {
    return `+${formatDelta(delta)} lb next time`;
  }

  if (update.result === "reduced" && delta < 0) {
    return `${formatDelta(Math.abs(delta))} lb lighter next time`;
  }

  return `Stays at ${formatDelta(nextWeight)} lb next time`;
}

export function getWorkoutSummaryOutcomes(summary: CompleteWorkoutSessionResponse): WorkoutSummaryOutcome[] {
  const stats = getWorkoutSummaryStats(summary.workoutSession);
  const increasedUpdates = summary.progressionUpdates.filter((update) => update.result === "increased");
  const outcomes: WorkoutSummaryOutcome[] = [
    {
      label: "Exercises",
      value: `${stats.completedExerciseCount}/${stats.exerciseCount}`,
      detail: "completed"
    },
    {
      label: "Sets",
      value: `${stats.completedSetCount}/${stats.plannedSetCount}`,
      detail: stats.failedSetCount > 0 ? `${stats.failedSetCount} missed` : "logged"
    },
    {
      label: "Volume",
      value: `${formatNumber(stats.totalVolume)} lb`,
      detail: "total work"
    }
  ];

  if (increasedUpdates.length > 0) {
    outcomes.push({
      label: "Progress",
      value: `${increasedUpdates.length}`,
      detail: `lift${increasedUpdates.length === 1 ? "" : "s"} moving up`
    });
  } else if (stats.durationMinutes) {
    outcomes.push({
      label: "Time",
      value: `${stats.durationMinutes} min`,
      detail: "training time"
    });
  }

  return outcomes;
}
