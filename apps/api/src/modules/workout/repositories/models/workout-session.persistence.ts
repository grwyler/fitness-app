import type {
  EffortFeedback,
  ExerciseCategory,
  ExerciseLoggingModality,
  RecoveryState,
  SetFailureStatus,
  SetRir,
  SetStatus,
  WorkoutSetType,
  WorkoutSessionStatus
} from "@fitness/shared";

export type WorkoutSessionRecord = {
  id: string;
  userId: string;
  programId: string;
  workoutTemplateId: string;
  status: WorkoutSessionStatus;
  startedAt: Date | null;
  completedAt: Date | null;
  durationSeconds: number | null;
  isPartial: boolean;
  userEffortFeedback: EffortFeedback | null;
  recoveryState: RecoveryState | null;
  programNameSnapshot: string;
  workoutNameSnapshot: string;
  createdAt: Date;
  updatedAt: Date;
};

export type ExerciseEntryRecord = {
  id: string;
  workoutSessionId: string;
  exerciseId: string;
  workoutTemplateExerciseEntryId: string | null;
  sequenceOrder: number;
  targetSets: number;
  targetReps: number | null;
  repRangeMin?: number | null;
  repRangeMax?: number | null;
  targetWeightLbs: number | null;
  targetDurationSeconds?: number | null;
  targetDistanceMeters?: number | null;
  targetRounds?: number | null;
  restSeconds: number | null;
  effortFeedback: EffortFeedback | null;
  completedAt: Date | null;
  exerciseNameSnapshot: string;
  exerciseCategorySnapshot: ExerciseCategory;
  loggingModalitySnapshot: ExerciseLoggingModality;
  progressionRuleSnapshot: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
};

export type SetRecord = {
  id: string;
  exerciseEntryId: string;
  setNumber: number;
  setType: WorkoutSetType;
  targetReps: number | null;
  actualReps: number | null;
  targetWeightLbs: number | null;
  actualWeightLbs: number | null;
  targetDurationSeconds?: number | null;
  actualDurationSeconds?: number | null;
  targetDistanceMeters?: number | null;
  actualDistanceMeters?: number | null;
  targetRounds?: number | null;
  actualRounds?: number | null;
  status: SetStatus;
  rir: SetRir | null;
  failureStatus: SetFailureStatus | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type WorkoutSessionGraph = {
  session: WorkoutSessionRecord;
  exerciseEntries: ExerciseEntryRecord[];
  sets: SetRecord[];
};

export type WorkoutSetForLoggingRecord = {
  set: SetRecord;
  exerciseEntry: ExerciseEntryRecord;
  workoutSession: WorkoutSessionRecord;
};

export type CreateWorkoutSessionGraphInput = {
  session: Omit<WorkoutSessionRecord, "id" | "createdAt" | "updatedAt">;
  exerciseEntries: Array<Omit<ExerciseEntryRecord, "id" | "createdAt" | "updatedAt">>;
  sets: Array<Omit<SetRecord, "id" | "createdAt" | "updatedAt">>;
};

export type AppendCustomExerciseInput = {
  sessionId: string;
  exerciseEntry: Omit<ExerciseEntryRecord, "id" | "workoutSessionId" | "createdAt" | "updatedAt">;
  sets: Array<Omit<SetRecord, "id" | "exerciseEntryId" | "createdAt" | "updatedAt">>;
};

export type AppendWorkoutSetInput = {
  exerciseEntryId: string;
  set: Omit<SetRecord, "id" | "exerciseEntryId" | "createdAt" | "updatedAt">;
  targetSets: number;
};

export type DeleteWorkoutSetInput = {
  setId: string;
  exerciseEntryId: string;
  targetSets: number;
};

export type UpdateWorkoutExerciseEntryInput = {
  exerciseEntryId: string;
  targetSets: number;
  targetReps: number | null;
  targetWeightLbs: number | null;
  targetDurationSeconds?: number | null;
  targetDistanceMeters?: number | null;
  targetRounds?: number | null;
  restSeconds: number | null;
};

export type DeleteWorkoutExerciseEntryInput = {
  exerciseEntryId: string;
};

export type UpdateLoggedSetInput = {
  setId: string;
  actualReps: number | null;
  actualWeightLbs: number | null;
  actualDurationSeconds?: number | null;
  actualDistanceMeters?: number | null;
  actualRounds?: number | null;
  setType?: WorkoutSetType;
  status: SetStatus;
  completedAt: Date;
  rir?: SetRir | null;
  failureStatus?: SetFailureStatus | null;
};

export type CompleteWorkoutSessionPersistenceInput = {
  sessionId: string;
  completedAt: Date;
  durationSeconds: number;
  isPartial: boolean;
  userEffortFeedback: EffortFeedback | null;
  recoveryState: RecoveryState | null;
};

export type CancelWorkoutSessionPersistenceInput = {
  sessionId: string;
};

export type PersistExerciseEntryFeedbackInput = {
  exerciseEntryId: string;
  effortFeedback: EffortFeedback;
  completedAt: Date;
};

export type SkipPendingWorkoutSetsInput = {
  sessionId: string;
  skippedAt: Date;
};

export type WorkoutHistorySummaryRecord = {
  id: string;
  workoutName: string;
  programName: string;
  status: WorkoutSessionStatus;
  startedAt: Date | null;
  completedAt: Date | null;
  durationSeconds: number | null;
  exerciseCount: number;
  plannedSetCount: number;
  completedSetCount: number;
  failedSetCount: number;
  isPartial: boolean;
};

export type CompletedWorkoutProgressionRecord = {
  workoutSessionId: string;
  workoutName: string;
  completedAt: Date;
  exerciseId: string;
  exerciseName: string;
  exerciseCategory: ExerciseCategory;
  setId: string;
  actualReps: number | null;
  actualWeightLbs: number | null;
  setStatus: SetStatus;
};
