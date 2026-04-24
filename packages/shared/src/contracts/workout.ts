import type {
  EffortFeedback,
  ExerciseCategory,
  ProgressMetricType,
  ProgressionResult,
  SetStatus,
  UnitSystem,
  WorkoutSessionStatus
} from "../domain/enums.js";
import type {
  CanonicalWeightLbs,
  ISODateTime,
  IdempotencyKey,
  UUID
} from "../domain/primitives.js";

export type IdempotentRequestHeaders = {
  "Idempotency-Key": IdempotencyKey;
};

export type WeightValueDto = {
  value: CanonicalWeightLbs;
  unit: "lb";
};

export type SetDto = {
  id: UUID;
  exerciseEntryId: UUID;
  setNumber: number;
  targetReps: number;
  actualReps: number | null;
  targetWeight: WeightValueDto;
  actualWeight: WeightValueDto | null;
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
  targetWeight: WeightValueDto;
  restSeconds: number | null;
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

export type NextWorkoutTemplateDto = {
  id: UUID;
  name: string;
  sequenceOrder: number;
  estimatedDurationMinutes: number | null;
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
  previousWeight: WeightValueDto;
  nextWeight: WeightValueDto;
  result: ProgressionResult;
  reason: string;
};

export type StartWorkoutSessionRequest = {
  workoutTemplateId?: UUID;
  startedAt?: ISODateTime;
};

export type LogSetRequest = {
  actualReps: number;
  actualWeight?: WeightValueDto;
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
  nextWorkoutTemplate: NextWorkoutTemplateDto | null;
};

export type DashboardDto = {
  activeWorkoutSession: WorkoutSessionDto | null;
  nextWorkoutTemplate: NextWorkoutTemplateDto | null;
  recentProgressMetrics: ProgressMetricDto[];
  recentWorkoutHistory: WorkoutHistoryItemDto[];
  weeklyWorkoutCount: number;
  userUnitSystem: UnitSystem;
};

export type GetDashboardResponse = DashboardDto;

export type CurrentWorkoutSessionDto = {
  activeWorkoutSession: WorkoutSessionDto | null;
};

export type GetCurrentWorkoutSessionResponse = CurrentWorkoutSessionDto;
