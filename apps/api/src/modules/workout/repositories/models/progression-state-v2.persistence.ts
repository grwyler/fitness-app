import type { EffortFeedback } from "@fitness/shared";

export type ProgressionStateV2Record = {
  id: string;
  userId: string;
  workoutTemplateExerciseEntryId: string;
  currentWeightLbs: number;
  lastCompletedWeightLbs: number | null;
  repGoal: number;
  repRangeMin: number;
  repRangeMax: number;
  consecutiveFailures: number;
  lastEffortFeedback: EffortFeedback | null;
  lastPerformedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateProgressionStateV2Input = {
  userId: string;
  workoutTemplateExerciseEntryId: string;
  currentWeightLbs: number;
  lastCompletedWeightLbs: number | null;
  repGoal: number;
  repRangeMin: number;
  repRangeMax: number;
  consecutiveFailures: number;
  lastEffortFeedback: EffortFeedback | null;
  lastPerformedAt: Date | null;
};

export type UpdateProgressionStateV2Input = {
  userId: string;
  workoutTemplateExerciseEntryId: string;
  currentWeightLbs: number;
  lastCompletedWeightLbs: number | null;
  repGoal: number;
  repRangeMin: number;
  repRangeMax: number;
  consecutiveFailures: number;
  lastEffortFeedback: EffortFeedback | null;
  lastPerformedAt: Date | null;
};

