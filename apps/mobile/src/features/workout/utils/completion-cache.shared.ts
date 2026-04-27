import type {
  CompleteWorkoutSessionResponse,
  DashboardDto,
  GetWorkoutHistoryResponse,
  WorkoutHistoryItemDto,
  WorkoutSessionDto
} from "@fitness/shared";

function buildHistoryItemFromCompletedWorkout(
  summary: CompleteWorkoutSessionResponse
): WorkoutHistoryItemDto {
  const workout = summary.workoutSession;
  const sets = workout.exercises.flatMap((exercise) => exercise.sets);

  return {
    id: workout.id,
    workoutName: workout.workoutName,
    programName: workout.programName,
    status: workout.status,
    isPartial: workout.isPartial,
    startedAt: workout.startedAt,
    completedAt: workout.completedAt,
    durationSeconds: workout.durationSeconds,
    exerciseCount: workout.exercises.length,
    plannedSetCount: sets.length,
    completedSetCount: sets.filter((set) => set.status === "completed").length,
    failedSetCount: sets.filter((set) => set.status === "failed").length,
    highlights: summary.progressMetrics.map((metric) => metric.displayText)
  };
}

function sortCompletedHistoryItems(items: WorkoutHistoryItemDto[]) {
  return [...items].sort((left, right) => {
    const leftCompletedAt = left.completedAt ?? left.startedAt ?? "";
    const rightCompletedAt = right.completedAt ?? right.startedAt ?? "";
    return rightCompletedAt.localeCompare(leftCompletedAt);
  });
}

export function upsertCompletedWorkoutIntoHistory(
  current: GetWorkoutHistoryResponse | undefined,
  summary: CompleteWorkoutSessionResponse
): GetWorkoutHistoryResponse | undefined {
  if (!current) {
    return current;
  }

  const completedItem = buildHistoryItemFromCompletedWorkout(summary);
  const existingItems = current.items.filter((item) => item.id !== completedItem.id);

  return {
    ...current,
    items: sortCompletedHistoryItems([completedItem, ...existingItems])
  };
}

export function applyCompletedWorkoutToDashboard(
  current: DashboardDto | undefined,
  summary: CompleteWorkoutSessionResponse
): DashboardDto | undefined {
  if (!current) {
    return current;
  }

  const nextHistory = upsertCompletedWorkoutIntoHistory(
    {
      items: current.recentWorkoutHistory,
      nextCursor: null
    },
    summary
  );

  return {
    ...current,
    activeWorkoutSession: null,
    nextWorkoutTemplate: summary.nextWorkoutTemplate,
    recentProgressMetrics: [
      ...summary.progressMetrics,
      ...current.recentProgressMetrics.filter(
        (metric) => !summary.progressMetrics.some((completedMetric) => completedMetric.id === metric.id)
      )
    ],
    recentWorkoutHistory: nextHistory?.items ?? current.recentWorkoutHistory
  };
}

export function getCompletedWorkoutDetail(summary: CompleteWorkoutSessionResponse): WorkoutSessionDto {
  return summary.workoutSession;
}
