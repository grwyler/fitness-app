import type {
  EffortFeedback,
  ExerciseCategory,
  ProgressMetricType,
  ProgressionResult,
  SetStatus,
  WorkoutSessionStatus
} from "../domain/enums.js";
import type { ISODateTime, UUID } from "../domain/primitives.js";

export type SetDto = {
  id: UUID;
  exerciseEntryId: UUID;
  setNumber: number;
  targetReps: number;
  actualReps: number | null;
  targetWeightLbs: number;
  actualWeightLbs: number | null;
  status: SetStatus;
  completedAt: ISODateTime | null;
};

export type ExerciseEntryDto = {
  id: UUID;
  exerciseId: UUID;
  exerciseName: string;
  category: ExerciseCategory;
  sequenceOrder: number;
  targetSets: number;
  targetReps: number;
  targetWeightLbs: number;
  effortFeedback: EffortFeedback | null;
  completedAt: ISODateTime | null;
  sets: SetDto[];
};

export type WorkoutSessionDto = {
  id: UUID;
  status: WorkoutSessionStatus;
  programId: UUID;
  workoutTemplateId: UUID;
  programName: string;
  workoutName: string;
  startedAt: ISODateTime | null;
  completedAt: ISODateTime | null;
  durationSeconds: number | null;
  exercises: ExerciseEntryDto[];
};

export type WorkoutHistoryItemDto = {
  id: UUID;
  workoutName: string;
  programName: string;
  status: WorkoutSessionStatus;
  startedAt: ISODateTime | null;
  completedAt: ISODateTime | null;
  durationSeconds: number | null;
  exerciseCount: number;
  completedSetCount: number;
  failedSetCount: number;
  highlights: string[];
};

export type ProgressMetricDto = {
  id: UUID;
  metricType: ProgressMetricType;
  metricValue: number | null;
  displayText: string;
  recordedAt: ISODateTime;
};

export type ProgressionUpdateDto = {
  exerciseId: UUID;
  exerciseName: string;
  previousWeightLbs: number;
  nextWeightLbs: number;
  result: ProgressionResult;
  reason: string;
};

export type StartWorkoutSessionRequest = {
  workoutTemplateId?: UUID;
  startedAt?: ISODateTime;
};

export type LogSetRequest = {
  actualReps: number;
  actualWeightLbs?: number;
  completedAt?: ISODateTime;
};

export type LogSetResponse = {
  set: SetDto;
  exerciseEntry: {
    id: UUID;
    completedSetCount: number;
    totalSetCount: number;
    hasFailures: boolean;
    isComplete: boolean;
  };
  workoutSession: {
    id: UUID;
    status: WorkoutSessionStatus;
  };
};

export type ExerciseFeedbackInput = {
  exerciseEntryId: UUID;
  effortFeedback: EffortFeedback;
};

export type CompleteWorkoutSessionRequest = {
  completedAt?: ISODateTime;
  exerciseFeedback: ExerciseFeedbackInput[];
  userEffortFeedback?: EffortFeedback;
};

export type CompleteWorkoutSessionResponse = {
  workoutSession: WorkoutSessionDto;
  progressionUpdates: ProgressionUpdateDto[];
  progressMetrics: ProgressMetricDto[];
  nextWorkoutTemplate: {
    id: UUID;
    name: string;
    sequenceOrder: number;
  } | null;
};

export type DashboardDto = {
  activeWorkoutSession: WorkoutSessionDto | null;
  nextWorkoutTemplate: {
    id: UUID;
    name: string;
    sequenceOrder: number;
    estimatedDurationMinutes: number | null;
  } | null;
  recentProgressMetrics: ProgressMetricDto[];
  recentWorkoutHistory: WorkoutHistoryItemDto[];
  weeklyWorkoutCount: number;
};

