import { progressMetrics } from "@fitness/db";
import { randomUUID } from "node:crypto";
import type { ProgressMetricRepository } from "../../repositories/interfaces/progress-metric.repository.js";
import type { RepositoryOptions } from "../../repositories/models/persistence-context.js";
import type {
  CreateProgressMetricInput,
  ProgressMetricRecord
} from "../../repositories/models/progress-metric.persistence.js";
import { desc, eq, normalizeNullableNumeric, resolveExecutor } from "../db/drizzle-helpers.js";

function mapProgressMetricRecord(row: typeof progressMetrics.$inferSelect): ProgressMetricRecord {
  return {
    id: row.id,
    userId: row.userId,
    exerciseId: row.exerciseId,
    workoutSessionId: row.workoutSessionId,
    metricType: row.metricType,
    metricValue: normalizeNullableNumeric(row.metricValue),
    displayText: row.displayText,
    recordedAt: row.recordedAt,
    createdAt: row.createdAt
  };
}

export class DrizzleProgressMetricRepository implements ProgressMetricRepository {
  public constructor(private readonly db: any) {}

  public async createMany(
    inputs: CreateProgressMetricInput[],
    options?: RepositoryOptions
  ): Promise<ProgressMetricRecord[]> {
    if (inputs.length === 0) {
      return [];
    }

    const executor = resolveExecutor(this.db, options);
    const rows = await executor
      .insert(progressMetrics)
      .values(
        inputs.map((input) => ({
          id: randomUUID(),
          ...input,
          metricValue: input.metricValue === null ? null : input.metricValue.toString()
        }))
      )
      .returning();

    return rows.map(mapProgressMetricRecord);
  }

  public async listRecentByUserId(
    userId: string,
    limit: number,
    options?: RepositoryOptions
  ): Promise<ProgressMetricRecord[]> {
    const executor = resolveExecutor(this.db, options);
    const rows = await executor
      .select()
      .from(progressMetrics)
      .where(eq(progressMetrics.userId, userId))
      .orderBy(desc(progressMetrics.recordedAt))
      .limit(limit);

    return rows.map(mapProgressMetricRecord);
  }
}
