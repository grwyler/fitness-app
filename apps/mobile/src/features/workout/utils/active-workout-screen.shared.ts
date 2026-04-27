import type { CompleteWorkoutSessionRequest, EffortFeedback, WorkoutSessionDto } from "@fitness/shared";

export type WorkoutCompletionUiState = {
  hasPendingSets: boolean;
  hasCompleteFeedback: boolean;
  finishButtonLabel: "End workout" | "Complete workout";
  finishButtonDisabled: boolean;
  footerMessage: string;
};

export function getWorkoutCompletionUiState(
  workout: WorkoutSessionDto,
  feedbackByEntryId: Record<string, EffortFeedback | undefined>,
  input?: {
    hasPendingSetSave?: boolean;
  }
): WorkoutCompletionUiState {
  const hasPendingSetSave = input?.hasPendingSetSave === true;
  const hasPendingSets = workout.exercises.some((exercise) =>
    exercise.sets.some((set) => set.status === "pending")
  );
  const hasCompleteFeedback = workout.exercises.every(
    (exercise) => feedbackByEntryId[exercise.id] !== undefined
  );

  return {
    hasPendingSets,
    hasCompleteFeedback,
    finishButtonLabel: hasPendingSets ? "End workout" : "Complete workout",
    finishButtonDisabled: hasPendingSetSave || (!hasPendingSets && !hasCompleteFeedback),
    footerMessage:
      hasPendingSetSave
        ? "Saving your last set before finishing."
        : !hasPendingSets && hasCompleteFeedback
        ? "All sets are logged and feedback is ready."
        : hasPendingSets
          ? "You can finish early. Only logged sets will count toward progression."
          : "Choose feedback for every exercise to complete the workout."
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
  }
): CompleteWorkoutSessionRequest {
  return {
    exerciseFeedback: workout.exercises
      .filter((exercise) => feedbackByEntryId[exercise.id] !== undefined)
      .map((exercise) => ({
        exerciseEntryId: exercise.id,
        effortFeedback: feedbackByEntryId[exercise.id]!
      })),
    finishEarly: input.finishEarly
  };
}

export function getWorkoutCompletionErrorMessage(error: unknown) {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return "Workout not saved. Check your connection and try again.";
}
