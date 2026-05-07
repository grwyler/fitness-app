import { progressionRecommendationEvents } from "@fitness/db";
import { randomUUID } from "node:crypto";
import type { ProgressionRecommendationEventRepository } from "../../repositories/interfaces/progression-recommendation-event.repository.js";
import type { RepositoryOptions } from "../../repositories/models/persistence-context.js";
import type {
  CreateProgressionRecommendationEventInput,
  ProgressionRecommendationEventRecord
} from "../../repositories/models/progression-recommendation-event.persistence.js";
import { and, desc, eq, normalizeNumeric, resolveExecutor } from "../db/drizzle-helpers.js";

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
    resolutionType: (row.resolutionType as any) ?? "unresolved",
    resolvedByUserId: (row.resolvedByUserId as any) ?? null,
    resolvedAt: (row.resolvedAt as any) ?? null,
    resolutionNote: (row.resolutionNote as any) ?? null,
    resolutionOriginalSnapshot: (row.resolutionOriginalSnapshot as any) ?? null,
    resolutionFinalSnapshot: (row.resolutionFinalSnapshot as any) ?? null,
    resolutionRelatedSetIds: (row.resolutionRelatedSetIds as any) ?? null,
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

  public async findOwnedById(
    userId: string,
    id: string,
    options?: RepositoryOptions
  ): Promise<ProgressionRecommendationEventRecord | null> {
    const executor = resolveExecutor(this.db, options);
    const row = await executor
      .select()
      .from(progressionRecommendationEvents)
      .where(and(eq(progressionRecommendationEvents.userId, userId), eq(progressionRecommendationEvents.id, id)))
      .limit(1)
      .then((rows: any[]) => rows[0] ?? null);

    return row ? mapProgressionRecommendationEventRecord(row) : null;
  }

  public async listBySessionId(
    userId: string,
    workoutSessionId: string,
    options?: RepositoryOptions
  ): Promise<ProgressionRecommendationEventRecord[]> {
    const executor = resolveExecutor(this.db, options);
    const rows = await executor
      .select()
      .from(progressionRecommendationEvents)
      .where(
        and(
          eq(progressionRecommendationEvents.userId, userId),
          eq(progressionRecommendationEvents.workoutSessionId, workoutSessionId)
        )
      )
      .orderBy(desc(progressionRecommendationEvents.createdAt));

    return rows.map(mapProgressionRecommendationEventRecord);
  }

  public async resolveOwnedEvent(
    input: {
      userId: string;
      id: string;
      workoutSessionId: string;
      resolutionType: ProgressionRecommendationEventRecord["resolutionType"];
      resolvedByUserId: string;
      resolvedAt: Date;
      note: string | null;
      resolutionOriginalSnapshot: Record<string, unknown>;
      resolutionFinalSnapshot: Record<string, unknown>;
      relatedSetIds: string[] | null;
    },
    options?: RepositoryOptions
  ): Promise<ProgressionRecommendationEventRecord> {
    const executor = resolveExecutor(this.db, options);
    const rows = await executor
      .update(progressionRecommendationEvents)
      .set({
        resolutionType: input.resolutionType,
        resolvedByUserId: input.resolvedByUserId,
        resolvedAt: input.resolvedAt,
        resolutionNote: input.note,
        resolutionOriginalSnapshot: input.resolutionOriginalSnapshot,
        resolutionFinalSnapshot: input.resolutionFinalSnapshot,
        resolutionRelatedSetIds: input.relatedSetIds
      })
      .where(
        and(
          eq(progressionRecommendationEvents.userId, input.userId),
          eq(progressionRecommendationEvents.id, input.id),
          eq(progressionRecommendationEvents.workoutSessionId, input.workoutSessionId)
        )
      )
      .returning();

    const updated = rows[0] ?? null;
    if (!updated) {
      throw new Error("Progression recommendation event resolution update failed.");
    }

    return mapProgressionRecommendationEventRecord(updated);
  }
}
