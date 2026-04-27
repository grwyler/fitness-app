import type { RepositoryOptions } from "../models/persistence-context.js";
import type {
  CompletedWorkoutProgressionRecord,
  CompleteWorkoutSessionPersistenceInput,
  CreateWorkoutSessionGraphInput,
  PersistExerciseEntryFeedbackInput,
  UpdateLoggedSetInput,
  WorkoutHistorySummaryRecord,
  WorkoutSessionGraph,
  WorkoutSessionRecord,
  WorkoutSetForLoggingRecord
} from "../models/workout-session.persistence.js";

export interface WorkoutSessionRepository {
  findInProgressByUserId(
    userId: string,
    options?: RepositoryOptions
  ): Promise<WorkoutSessionGraph | null>;

  findOwnedById(
    userId: string,
    sessionId: string,
    options?: RepositoryOptions
  ): Promise<WorkoutSessionRecord | null>;

  findOwnedSessionGraphById(
    userId: string,
    sessionId: string,
    options?: RepositoryOptions
  ): Promise<WorkoutSessionGraph | null>;

  findOwnedSetForLogging(
    userId: string,
    setId: string,
    options?: RepositoryOptions
  ): Promise<WorkoutSetForLoggingRecord | null>;

  createSessionGraph(
    input: CreateWorkoutSessionGraphInput,
    options?: RepositoryOptions
  ): Promise<WorkoutSessionGraph>;

  updateLoggedSet(
    input: UpdateLoggedSetInput,
    options?: RepositoryOptions
  ): Promise<WorkoutSetForLoggingRecord>;

  persistExerciseEntryFeedback(
    inputs: PersistExerciseEntryFeedbackInput[],
    options?: RepositoryOptions
  ): Promise<void>;

  completeSession(
    input: CompleteWorkoutSessionPersistenceInput,
    options?: RepositoryOptions
  ): Promise<WorkoutSessionRecord>;

  listRecentCompletedByUserId(
    userId: string,
    limit: number,
    options?: RepositoryOptions
  ): Promise<WorkoutHistorySummaryRecord[]>;

  countCompletedByUserIdWithinRange(
    userId: string,
    range: {
      startsAt: Date;
      endsAt: Date;
    },
    options?: RepositoryOptions
  ): Promise<number>;

  countCompletedByUserId(userId: string, options?: RepositoryOptions): Promise<number>;

  countCompletedByUserIdAndProgramId(
    userId: string,
    programId: string,
    options?: RepositoryOptions
  ): Promise<number>;

  listCompletedProgressionByUserId(
    userId: string,
    limit: number,
    options?: RepositoryOptions
  ): Promise<CompletedWorkoutProgressionRecord[]>;
}
