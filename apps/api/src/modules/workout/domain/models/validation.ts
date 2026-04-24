import type { EffortFeedback, SetStatus, WorkoutSessionStatus } from "@fitness/shared";

export type LogSetValidationInput = {
  workoutSessionStatus: WorkoutSessionStatus;
  setStatus: SetStatus;
};

export type WorkoutCompletionExercise = {
  exerciseEntryId: string;
  setStatuses: SetStatus[];
};

export type WorkoutCompletionValidationInput = {
  workoutSessionStatus: WorkoutSessionStatus;
  exercises: WorkoutCompletionExercise[];
  exerciseFeedback: Record<string, EffortFeedback | undefined>;
};

