import { userExerciseProgressionSettings } from "@fitness/db";
import { and, eq, normalizeNullableNumeric, resolveExecutor } from "../db/drizzle-helpers.js";
import type {
  ExerciseProgressionSettingsRepository,
  UpsertUserExerciseProgressionSettingsInput,
  UserExerciseProgressionSettingsRecord
} from "../../repositories/interfaces/exercise-progression-settings.repository.js";
import type { RepositoryOptions } from "../../repositories/models/persistence-context.js";

function mapRow(row: any): UserExerciseProgressionSettingsRecord {
  return {
    userId: row.userId,
    exerciseId: row.exerciseId,
    progressionStrategy: row.progressionStrategy ?? null,
    repRangeMin: row.repRangeMin ?? null,
    repRangeMax: row.repRangeMax ?? null,
    incrementOverrideLbs: normalizeNullableNumeric(row.incrementOverrideLbs),
    maxJumpPerSessionLbs: normalizeNullableNumeric(row.maxJumpPerSessionLbs),
    bodyweightProgressionMode: row.bodyweightProgressionMode ?? null
  };
}

export class DrizzleExerciseProgressionSettingsRepository implements ExerciseProgressionSettingsRepository {
  public constructor(private readonly db: any) {}

  public async findByUserIdAndExerciseId(
    userId: string,
    exerciseId: string,
    options?: RepositoryOptions
  ): Promise<UserExerciseProgressionSettingsRecord | null> {
    const executor = resolveExecutor(this.db, options);
    const rows = await executor
      .select({
        userId: userExerciseProgressionSettings.userId,
        exerciseId: userExerciseProgressionSettings.exerciseId,
        progressionStrategy: userExerciseProgressionSettings.progressionStrategy,
        repRangeMin: userExerciseProgressionSettings.repRangeMin,
        repRangeMax: userExerciseProgressionSettings.repRangeMax,
        incrementOverrideLbs: userExerciseProgressionSettings.incrementOverrideLbs,
        maxJumpPerSessionLbs: userExerciseProgressionSettings.maxJumpPerSessionLbs,
        bodyweightProgressionMode: userExerciseProgressionSettings.bodyweightProgressionMode
      })
      .from(userExerciseProgressionSettings)
      .where(and(eq(userExerciseProgressionSettings.userId, userId), eq(userExerciseProgressionSettings.exerciseId, exerciseId)))
      .limit(1);

    const [row] = rows;
    if (!row) {
      return null;
    }

    return mapRow(row);
  }

  public async upsert(
    input: UpsertUserExerciseProgressionSettingsInput,
    options?: RepositoryOptions
  ): Promise<UserExerciseProgressionSettingsRecord> {
    const executor = resolveExecutor(this.db, options);

    const existing = await this.findByUserIdAndExerciseId(input.userId, input.exerciseId, options);
    if (existing) {
      await executor
        .update(userExerciseProgressionSettings)
        .set({
          progressionStrategy: input.progressionStrategy,
          repRangeMin: input.repRangeMin,
          repRangeMax: input.repRangeMax,
          incrementOverrideLbs: input.incrementOverrideLbs,
          maxJumpPerSessionLbs: input.maxJumpPerSessionLbs,
          bodyweightProgressionMode: input.bodyweightProgressionMode,
          updatedAt: new Date()
        })
        .where(and(eq(userExerciseProgressionSettings.userId, input.userId), eq(userExerciseProgressionSettings.exerciseId, input.exerciseId)));

      const updated = await this.findByUserIdAndExerciseId(input.userId, input.exerciseId, options);
      if (!updated) {
        throw new Error("Unable to upsert exercise progression settings.");
      }
      return updated;
    }

    await executor.insert(userExerciseProgressionSettings).values({
      userId: input.userId,
      exerciseId: input.exerciseId,
      progressionStrategy: input.progressionStrategy,
      repRangeMin: input.repRangeMin,
      repRangeMax: input.repRangeMax,
      incrementOverrideLbs: input.incrementOverrideLbs,
      maxJumpPerSessionLbs: input.maxJumpPerSessionLbs,
      bodyweightProgressionMode: input.bodyweightProgressionMode
    });

    const created = await this.findByUserIdAndExerciseId(input.userId, input.exerciseId, options);
    if (!created) {
      throw new Error("Unable to upsert exercise progression settings.");
    }
    return created;
  }
}

