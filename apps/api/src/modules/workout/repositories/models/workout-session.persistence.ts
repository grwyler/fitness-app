import type { EffortFeedback, ExerciseCategory, SetStatus, WorkoutSessionStatus } from "@fitness/shared";

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
  programNameSnapshot: string;
  workoutNameSnapshot: string;
  createdAt: Date;
  updatedAt: Date;
};

export type ExerciseEntryRecord = {
  id: string;
  workoutSessionId: string;
  exerciseId: string;
  sequenceOrder: number;
  targetSets: number;
  targetReps: number;
  targetWeightLbs: number;
  restSeconds: number | null;
  effortFeedback: EffortFeedback | null;
  completedAt: Date | null;
  exerciseNameSnapshot: string;
  exerciseCategorySnapshot: ExerciseCategory;
  progressionRuleSnapshot: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
};

export type SetRecord = {
  id: string;
  exerciseEntryId: string;
  setNumber: number;
  targetReps: number;
  actualReps: number | null;
  targetWeightLbs: number;
  actualWeightLbs: number | null;
  status: SetStatus;
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

export type UpdateLoggedSetInput = {
  setId: string;
  actualReps: number;
  actualWeightLbs: number;
  status: SetStatus;
  completedAt: Date;
};

export type CompleteWorkoutSessionPersistenceInput = {
  sessionId: string;
  completedAt: Date;
  durationSeconds: number;
  isPartial: boolean;
  userEffortFeedback: EffortFeedback | null;
};

export type PersistExerciseEntryFeedbackInput = {
  exerciseEntryId: string;
  effortFeedback: EffortFeedback;
  completedAt: Date;
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
