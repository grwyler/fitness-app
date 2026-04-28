import type { EffortFeedback, ExerciseCategory, ProgressionResult } from "@fitness/shared";

export type ProgressionStateSnapshot = {
  currentWeightLbs: number;
  lastCompletedWeightLbs: number | null;
  consecutiveFailures: number;
  lastEffortFeedback: EffortFeedback | null;
};

export type ExerciseProgressionContext = {
  exerciseName: string;
  exerciseCategory: ExerciseCategory;
  incrementLbs: number;
};

export type ExerciseWorkoutOutcome = {
  effortFeedback: EffortFeedback;
  hasFailure?: boolean;
  sets?: ExerciseWorkoutSetOutcome[];
};

export type ExerciseWorkoutSetOutcome = {
  targetReps: number;
  actualReps: number | null;
  targetWeightLbs: number;
  actualWeightLbs: number | null;
};

export type ProgressionComputationInput = {
  state: ProgressionStateSnapshot;
  exercise: ExerciseProgressionContext;
  outcome: ExerciseWorkoutOutcome;
};

export type ProgressionComputationResult = {
  previousWeightLbs: number;
  nextWeightLbs: number;
  result: ProgressionResult;
  reason: string;
  nextState: ProgressionStateSnapshot;
};
