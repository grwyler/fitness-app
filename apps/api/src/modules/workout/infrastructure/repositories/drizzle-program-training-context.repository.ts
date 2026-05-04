import { randomUUID } from "node:crypto";
import { programTrainingContexts } from "@fitness/db";
import { resolveExecutor } from "../db/drizzle-helpers.js";
import type {
  CreateProgramTrainingContextInput,
  ProgramTrainingContextRecord,
  ProgramTrainingContextRepository
} from "../../repositories/interfaces/program-training-context.repository.js";
import type { RepositoryOptions } from "../../repositories/models/persistence-context.js";

function mapRow(row: typeof programTrainingContexts.$inferSelect): ProgramTrainingContextRecord {
  return {
    id: row.id,
    userId: row.userId,
    programId: row.programId,
    enrollmentId: row.enrollmentId ?? null,
    source: row.source,
    goalType: row.goalType ?? null,
    experienceLevel: row.experienceLevel ?? null,
    progressionPreferencesSnapshot: row.progressionPreferencesSnapshot,
    recoveryPreferencesSnapshot: row.recoveryPreferencesSnapshot,
    equipmentSettingsSnapshot: row.equipmentSettingsSnapshot,
    exerciseProgressionSettingsSnapshot: row.exerciseProgressionSettingsSnapshot,
    guidedAnswersSnapshot: row.guidedAnswersSnapshot ?? null,
    guidedRecommendationSnapshot: row.guidedRecommendationSnapshot ?? null,
    coachingEnabled: row.coachingEnabled,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

export class DrizzleProgramTrainingContextRepository implements ProgramTrainingContextRepository {
  public constructor(private readonly db: any) {}

  public async create(
    input: CreateProgramTrainingContextInput,
    options?: RepositoryOptions
  ): Promise<ProgramTrainingContextRecord> {
    const executor = resolveExecutor(this.db, options);

    const [row] = await executor
      .insert(programTrainingContexts)
      .values({
        id: randomUUID(),
        userId: input.userId,
        programId: input.programId,
        enrollmentId: input.enrollmentId ?? null,
        source: input.source,
        goalType: input.goalType,
        experienceLevel: input.experienceLevel,
        progressionPreferencesSnapshot: input.progressionPreferencesSnapshot,
        recoveryPreferencesSnapshot: input.recoveryPreferencesSnapshot,
        equipmentSettingsSnapshot: input.equipmentSettingsSnapshot,
        exerciseProgressionSettingsSnapshot: input.exerciseProgressionSettingsSnapshot,
        guidedAnswersSnapshot: input.guidedAnswersSnapshot ?? null,
        guidedRecommendationSnapshot: input.guidedRecommendationSnapshot ?? null,
        ...(input.coachingEnabled !== undefined ? { coachingEnabled: input.coachingEnabled } : {})
      })
      .returning();

    if (row) {
      return mapRow(row);
    }

    throw new Error("Unable to create program training context.");
  }
}
