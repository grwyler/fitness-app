import type { EffortFeedback, ExerciseCategory, ProgressionResult } from "@fitness/shared";

export type ProgressionStateSnapshot = {
  currentWeightLbs: number;
  lastCompletedWeightLbs: number | null;
  consecutiveFailures: number;
  lastEffortFeedback: EffortFeedback | null;
};

export type ProgressionStateSnapshotV2 = ProgressionStateSnapshot & {
  repGoal: number;
  repRangeMin: number;
  repRangeMax: number;
};

export type ExerciseProgressionContext = {
  exerciseName: string;
  exerciseCategory: ExerciseCategory;
  incrementLbs: number;
  isBodyweight: boolean;
  isWeightOptional: boolean;
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

export type ProgressionComputationInputV2 = {
  state: ProgressionStateSnapshotV2;
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

export type ProgressionComputationResultV2 = {
  previousWeightLbs: number;
  nextWeightLbs: number;
  previousRepGoal: number;
  nextRepGoal: number;
  result: ProgressionResult;
  reason: string;
  nextState: ProgressionStateSnapshotV2;
};
