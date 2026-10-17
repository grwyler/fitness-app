import type {
  EffortFeedback,
  ExerciseCategory,
  ExperienceLevel,
  ProgressionAggressiveness,
  ProgressionResult,
  SetFailureStatus,
  SetRir,
  RecoveryState,
  TrainingGoal
} from "@fitness/shared";
import type { ComparableExerciseHistory } from "../../repositories/models/workout-session.persistence.js";
import type { ProgressionStateV2Record } from "../../repositories/models/progression-state-v2.persistence.js";

export type GeneratedSetTarget = {
  setNumber: number;
  targetReps: number | null;
  targetWeightLbs: number | null;
  repTargetText: string | null;
  tiers: import("@fitness/shared").WorkoutSetTierDto[] | null;
  previousActualReps?: number | null;
  previousActualWeightLbs?: number | null;
  reason?: string | null;
};

export type PrescriptionGenerationInput = {
  state: ProgressionStateV2Record;
  exercise: ExerciseProgressionContext;
  loggingModality: "reps_load" | "reps_only";
  strategy: import("@fitness/shared").ProgressionStrategy;
  setScheme: import("@fitness/shared").ExerciseSetScheme;
  targetSets: number;
  planTargetWeightLbs?: number | null;
  defaultStartingWeightLbs?: number;
  explicitTargets?: import("@fitness/shared").WorkoutSetTargetDto[] | null;
  history?: ComparableExerciseHistory | null;
  performedAt?: Date;
};

export type ProgressionStateSnapshot = {
  currentWeightLbs: number;
  lastCompletedWeightLbs: number | null;
  consecutiveFailures: number;
  lastEffortFeedback: EffortFeedback | null;
  lastPerformedAt?: Date | null;
};

export type ProgressionStateSnapshotV2 = ProgressionStateSnapshot & {
  repGoal: number;
  repRangeMin: number;
  repRangeMax: number;
};

export type ExerciseLoadType = "external" | "assistance";

export type ExerciseProgressionContext = {
  exerciseName: string;
  exerciseCategory: ExerciseCategory;
  incrementLbs: number;
  isBodyweight: boolean;
  isWeightOptional: boolean;
  loadType?: ExerciseLoadType;
};

export type ExerciseWorkoutOutcome = {
  effortFeedback: EffortFeedback;
  effortFeedbackDefaulted?: boolean;
  hasFailure?: boolean;
  sets?: ExerciseWorkoutSetOutcome[];
};

export type ExerciseWorkoutSetOutcome = {
  targetReps: number;
  actualReps: number | null;
  targetWeightLbs: number;
  actualWeightLbs: number | null;
  rir?: SetRir | null;
  failureStatus?: SetFailureStatus | null;
};

export type ProgressionComputationInput = {
  state: ProgressionStateSnapshot;
  exercise: ExerciseProgressionContext;
  outcome: ExerciseWorkoutOutcome;
  performedAt?: Date;
  experienceLevel?: ExperienceLevel | null;
  trainingGoal?: TrainingGoal | null;
  recoveryState?: RecoveryState | null;
  progressionAggressiveness?: ProgressionAggressiveness | null;
  allowAutoDeload?: boolean;
  allowRecalibration?: boolean;
  preferRepProgressionBeforeWeight?: boolean;
};

export type ProgressionComputationInputV2 = {
  state: ProgressionStateSnapshotV2;
  exercise: ExerciseProgressionContext;
  outcome: ExerciseWorkoutOutcome;
  performedAt?: Date;
  experienceLevel?: ExperienceLevel | null;
  trainingGoal?: TrainingGoal | null;
  recoveryState?: RecoveryState | null;
  progressionAggressiveness?: ProgressionAggressiveness | null;
  allowAutoDeload?: boolean;
  allowRecalibration?: boolean;
  preferRepProgressionBeforeWeight?: boolean;
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
