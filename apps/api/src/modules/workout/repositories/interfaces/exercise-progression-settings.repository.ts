import type { BodyweightProgressionMode, ProgressionStrategy } from "@fitness/shared";
import type { RepositoryOptions } from "../models/persistence-context.js";

export type UserExerciseProgressionSettingsRecord = {
  userId: string;
  exerciseId: string;
  progressionStrategy: ProgressionStrategy | null;
  repRangeMin: number | null;
  repRangeMax: number | null;
  incrementOverrideLbs: number | null;
  maxJumpPerSessionLbs: number | null;
  bodyweightProgressionMode: BodyweightProgressionMode | null;
};

export type UpsertUserExerciseProgressionSettingsInput = Omit<
  UserExerciseProgressionSettingsRecord,
  "userId"
> & { userId: string };

export interface ExerciseProgressionSettingsRepository {
  findByUserIdAndExerciseId(
    userId: string,
    exerciseId: string,
    options?: RepositoryOptions
  ): Promise<UserExerciseProgressionSettingsRecord | null>;
  upsert(
    input: UpsertUserExerciseProgressionSettingsInput,
    options?: RepositoryOptions
  ): Promise<UserExerciseProgressionSettingsRecord>;
}

