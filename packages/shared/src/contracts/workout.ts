import type {
  EffortFeedback,
  ExerciseCategory,
  DifficultyLevel,
  ProgramSource,
  ProgressMetricType,
  ProgressionResult,
  EnrollmentStatus,
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

export type WorkoutSessionType = "program" | "custom";

export type PredefinedWorkoutCategory = "Push" | "Pull" | "Legs" | "Full Body" | "Quick";

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
  sessionType: WorkoutSessionType;
  isPartial: boolean;
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
  category: PredefinedWorkoutCategory;
  sequenceOrder: number;
  estimatedDurationMinutes: number | null;
};

export type ProgramPositionDto = {
  workoutNumber: number;
  weekNumber: number | null;
  dayNumber: number | null;
  label: string;
};

export type ExerciseCatalogItemDto = {
  id: UUID;
  name: string;
  category: ExerciseCategory;
  movementPattern: string | null;
  primaryMuscleGroup: string | null;
  equipmentType: string | null;
};

export type ProgramWorkoutExerciseDto = {
  id: UUID;
  exerciseId: UUID;
  exerciseName: string;
  category: ExerciseCategory;
  sequenceOrder: number;
  targetSets: number;
  targetReps: number;
  restSeconds: number | null;
};

export type ProgramWorkoutTemplateDto = {
  id: UUID;
  name: string;
  category: PredefinedWorkoutCategory;
  sequenceOrder: number;
  estimatedDurationMinutes: number | null;
  exercises: ProgramWorkoutExerciseDto[];
};

export type ProgramDto = {
  id: UUID;
  source: ProgramSource;
  name: string;
  description: string | null;
  daysPerWeek: number;
  sessionDurationMinutes: number;
  difficultyLevel: DifficultyLevel;
  workouts: ProgramWorkoutTemplateDto[];
};

export type CreateCustomProgramExerciseRequest = {
  exerciseId: UUID;
  targetSets: number;
  targetReps: number;
  restSeconds?: number | null;
};

export type CreateCustomProgramWorkoutRequest = {
  name: string;
  exercises: CreateCustomProgramExerciseRequest[];
};

export type CreateCustomProgramRequest = {
  name: string;
  workouts: CreateCustomProgramWorkoutRequest[];
};

export type CreateCustomProgramResponse = {
  program: ProgramDto;
};

export type ActiveProgramDto = {
  enrollmentId: UUID;
  program: ProgramDto;
  status: EnrollmentStatus;
  startedAt: ISODateTime;
  completedAt: ISODateTime | null;
  nextWorkoutTemplate: NextWorkoutTemplateDto | null;
  completedWorkoutCount: number;
  currentPosition: ProgramPositionDto;
};

export type WorkoutHistoryItemDto = {
  id: UUID;
  workoutName: string;
  programName: string;
  status: WorkoutSessionStatus;
  isPartial: boolean;
  startedAt: ISODateTime | null;
  completedAt: ISODateTime | null;
  durationSeconds: number | null;
  exerciseCount: number;
  plannedSetCount: number;
  completedSetCount: number;
  failedSetCount: number;
  highlights: string[];
};

export type GetWorkoutHistoryResponse = {
  items: WorkoutHistoryItemDto[];
  nextCursor: string | null;
};

export type GetWorkoutHistoryDetailResponse = {
  workoutSession: WorkoutSessionDto;
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

export type ProgressionVolumePointDto = {
  workoutSessionId: UUID;
  workoutName: string;
  completedAt: ISODateTime;
  totalVolume: WeightValueDto;
};

export type ExerciseProgressionPointDto = {
  workoutSessionId: UUID;
  completedAt: ISODateTime;
  bestWeight: WeightValueDto | null;
  bestReps: number | null;
  totalVolume: WeightValueDto;
};

export type ExerciseProgressionSummaryDto = {
  exerciseId: UUID;
  exerciseName: string;
  category: ExerciseCategory;
  completedWorkoutCount: number;
  recentBestWeight: WeightValueDto | null;
  recentBestReps: number | null;
  lastPerformedAt: ISODateTime | null;
  points: ExerciseProgressionPointDto[];
};

export type ProgressionSummaryDto = {
  totalCompletedWorkouts: number;
  workoutsCompletedThisWeek: number;
  currentStreakDays: number;
  recentWorkoutVolume: ProgressionVolumePointDto[];
  exercises: ExerciseProgressionSummaryDto[];
  assumptions: string[];
};

export type GetProgressionResponse = ProgressionSummaryDto;

export type StartWorkoutSessionRequest = {
  sessionType?: WorkoutSessionType;
  workoutTemplateId?: UUID;
  startedAt?: ISODateTime;
};

export type AddCustomWorkoutExerciseRequest = {
  exerciseId: UUID;
  targetSets: number;
  targetReps: number;
  restSeconds?: number | null;
};

export type AddWorkoutSetRequest = Record<string, never>;

export type DeleteWorkoutSetRequest = Record<string, never>;

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
  finishEarly?: boolean;
};

export type CompleteWorkoutSessionResponse = {
  workoutSession: WorkoutSessionDto;
  progressionUpdates: ProgressionUpdateDto[];
  progressMetrics: ProgressMetricDto[];
  nextWorkoutTemplate: NextWorkoutTemplateDto | null;
};

export type CancelWorkoutSessionRequest = Record<string, never>;

export type CancelWorkoutSessionResponse = {
  workoutSession: WorkoutSessionDto;
};

export type DashboardDto = {
  activeProgram: ActiveProgramDto | null;
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

export type ListProgramsResponse = {
  programs: ProgramDto[];
};

export type GetProgramResponse = {
  program: ProgramDto;
};

export type ListExercisesResponse = {
  exercises: ExerciseCatalogItemDto[];
};

export type FollowProgramResponse = {
  activeProgram: ActiveProgramDto;
};
