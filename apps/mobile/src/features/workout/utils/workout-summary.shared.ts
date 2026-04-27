import type { CompleteWorkoutSessionResponse, WorkoutSessionDto } from "@fitness/shared";

export type WorkoutSummaryStats = {
  completedSetCount: number;
  failedSetCount: number;
  plannedSetCount: number;
  totalVolume: number;
  durationMinutes: number | null;
};

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
    completedSetCount: completedSets.length,
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

