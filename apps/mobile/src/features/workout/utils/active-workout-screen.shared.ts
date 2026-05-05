import type { CompleteWorkoutSessionRequest, EffortFeedback, WorkoutSessionDto } from "@fitness/shared";
import type { RecoveryState } from "@fitness/shared";

export type WorkoutCompletionUiState = {
  hasPendingSets: boolean;
  hasCompleteFeedback: boolean;
  missingEffortFeedbackCompletedExerciseCount: number;
  finishButtonLabel: "End workout" | "Complete workout";
  finishButtonDisabled: boolean;
  footerMessage: string;
};

const DEFAULT_EXERCISE_EFFORT: EffortFeedback = "just_right";

export function getWorkoutCompletionUiState(
  workout: WorkoutSessionDto,
  feedbackByEntryId: Record<string, EffortFeedback | undefined>,
  input?: {
    hasPendingSetSave?: boolean;
  }
): WorkoutCompletionUiState {
  const hasPendingSetSave = input?.hasPendingSetSave === true;
  const hasExercises = workout.exercises.length > 0;
  const hasPendingSets = workout.exercises.some((exercise) =>
    exercise.sets.some((set) => set.status === "pending")
  );
  const completedExercisesMissingFeedback = [];
  const hasCompleteFeedback = hasExercises;

  return {
    hasPendingSets,
    hasCompleteFeedback,
    missingEffortFeedbackCompletedExerciseCount: completedExercisesMissingFeedback.length,
    finishButtonLabel: hasPendingSets ? "End workout" : "Complete workout",
    finishButtonDisabled: hasPendingSetSave || !hasExercises,
    footerMessage:
      hasPendingSetSave
        ? "Saving your last set before finishing."
        : !hasExercises
          ? "Add at least one exercise to continue."
        : hasPendingSets
          ? "You can finish early. Unlogged sets will be marked skipped, and exercises with skipped sets won't update progression."
          : "All sets are logged. Effort defaults to just right (optional to change)."
  };
}

export function getFinishWorkoutPressAction(input: {
  hasPendingSets: boolean;
  finishButtonDisabled: boolean;
}): "show_finish_early_confirmation" | "complete_workout" | "blocked" {
  if (input.finishButtonDisabled) {
    return "blocked";
  }

  return input.hasPendingSets ? "show_finish_early_confirmation" : "complete_workout";
}

export function buildCompleteWorkoutRequest(
  workout: WorkoutSessionDto,
  feedbackByEntryId: Record<string, EffortFeedback | undefined>,
  input: {
    finishEarly: boolean;
    recoveryState?: RecoveryState;
  }
): CompleteWorkoutSessionRequest {
  return {
    exerciseFeedback: workout.exercises
      .filter((exercise) => feedbackByEntryId[exercise.id] !== undefined)
      .map((exercise) => ({
        exerciseEntryId: exercise.id,
        effortFeedback: feedbackByEntryId[exercise.id] ?? DEFAULT_EXERCISE_EFFORT
      })),
    finishEarly: input.finishEarly,
    ...(input.recoveryState ? { recoveryState: input.recoveryState } : {})
  };
}

export function getWorkoutCompletionErrorMessage(error: unknown) {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return "Workout not saved. Check your connection and try again.";
}

export function getWorkoutDiscardErrorMessage(error: unknown) {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return "Workout not discarded. Check your connection and try again.";
}

export function getLoggedSetUpdateErrorMessage(error: unknown) {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "COMPLETED_WORKOUT_READ_ONLY"
  ) {
    return "Completed workouts are read-only for now.";
  }

  return "Set not updated. Check the values and try again.";
}
