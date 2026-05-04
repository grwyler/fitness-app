import { progressionRecommendationEvents } from "@fitness/db";
import { randomUUID } from "node:crypto";
import type { ProgressionRecommendationEventRepository } from "../../repositories/interfaces/progression-recommendation-event.repository.js";
import type { RepositoryOptions } from "../../repositories/models/persistence-context.js";
import type {
  CreateProgressionRecommendationEventInput,
  ProgressionRecommendationEventRecord
} from "../../repositories/models/progression-recommendation-event.persistence.js";
import { desc, eq, normalizeNumeric, resolveExecutor } from "../db/drizzle-helpers.js";

function mapProgressionRecommendationEventRecord(
  row: typeof progressionRecommendationEvents.$inferSelect
): ProgressionRecommendationEventRecord {
  return {
    id: row.id,
    userId: row.userId,
    exerciseId: row.exerciseId ?? null,
    workoutTemplateExerciseEntryId: row.workoutTemplateExerciseEntryId ?? null,
    workoutSessionId: row.workoutSessionId,
    exerciseEntryId: row.exerciseEntryId,
    previousWeightLbs: normalizeNumeric(row.previousWeightLbs),
    nextWeightLbs: normalizeNumeric(row.nextWeightLbs),
    previousRepGoal: row.previousRepGoal ?? null,
    nextRepGoal: row.nextRepGoal ?? null,
    result: row.result as any,
    reason: row.reason,
    confidence: row.confidence as any,
    reasonCodes: (row.reasonCodes as string[]) ?? [],
    evidence: (row.evidence as string[]) ?? [],
    inputSnapshot: (row.inputSnapshot as Record<string, unknown>) ?? {},
    createdAt: row.createdAt
  };
}

export class DrizzleProgressionRecommendationEventRepository
  implements ProgressionRecommendationEventRepository
{
  public constructor(private readonly db: any) {}

  public async createMany(
    inputs: CreateProgressionRecommendationEventInput[],
    options?: RepositoryOptions
  ): Promise<ProgressionRecommendationEventRecord[]> {
    if (inputs.length === 0) {
      return [];
    }

    const executor = resolveExecutor(this.db, options);
    const rows = await executor
      .insert(progressionRecommendationEvents)
      .values(
        inputs.map((input) => {
          const { id, ...rest } = input;
          return {
            id: id ?? randomUUID(),
            ...rest,
            previousWeightLbs: rest.previousWeightLbs.toString(),
            nextWeightLbs: rest.nextWeightLbs.toString()
          };
        })
      )
      .returning();

    return rows.map(mapProgressionRecommendationEventRecord);
  }

  public async listRecentByUserId(
    userId: string,
    limit: number,
    options?: RepositoryOptions
  ): Promise<ProgressionRecommendationEventRecord[]> {
    const executor = resolveExecutor(this.db, options);
    const rows = await executor
      .select()
      .from(progressionRecommendationEvents)
      .where(eq(progressionRecommendationEvents.userId, userId))
      .orderBy(desc(progressionRecommendationEvents.createdAt))
      .limit(limit);

    return rows.map(mapProgressionRecommendationEventRecord);
  }
}
