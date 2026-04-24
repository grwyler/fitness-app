import { progressionStates } from "@fitness/db";
import { randomUUID } from "node:crypto";
import type { ProgressionStateRepository } from "../../repositories/interfaces/progression-state.repository.js";
import type { RepositoryOptions } from "../../repositories/models/persistence-context.js";
import type {
  CreateProgressionStateInput,
  ProgressionStateRecord,
  UpdateProgressionStateInput
} from "../../repositories/models/progression-state.persistence.js";
import {
  and,
  eq,
  inArray,
  normalizeNullableNumeric,
  normalizeNumeric,
  resolveExecutor
} from "../db/drizzle-helpers.js";

function mapProgressionStateRecord(row: typeof progressionStates.$inferSelect): ProgressionStateRecord {
  return {
    id: row.id,
    userId: row.userId,
    exerciseId: row.exerciseId,
    currentWeightLbs: normalizeNumeric(row.currentWeightLbs),
    lastCompletedWeightLbs: normalizeNullableNumeric(row.lastCompletedWeightLbs),
    consecutiveFailures: row.consecutiveFailures,
    lastEffortFeedback: row.lastEffortFeedback,
    lastPerformedAt: row.lastPerformedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

export class DrizzleProgressionStateRepository implements ProgressionStateRepository {
  public constructor(private readonly db: any) {}

  public async findByUserIdAndExerciseIds(
    userId: string,
    exerciseIds: string[],
    options?: RepositoryOptions
  ): Promise<ProgressionStateRecord[]> {
    if (exerciseIds.length === 0) {
      return [];
    }

    const executor = resolveExecutor(this.db, options);
    const rows = await executor
      .select()
      .from(progressionStates)
      .where(and(eq(progressionStates.userId, userId), inArray(progressionStates.exerciseId, exerciseIds)));

    return rows.map(mapProgressionStateRecord);
  }

  public async createMany(
    inputs: CreateProgressionStateInput[],
    options?: RepositoryOptions
  ): Promise<ProgressionStateRecord[]> {
    if (inputs.length === 0) {
      return [];
    }

    const executor = resolveExecutor(this.db, options);
    const rows = await executor
      .insert(progressionStates)
      .values(inputs.map((input) => ({ id: randomUUID(), ...input })))
      .returning();

    return rows.map(mapProgressionStateRecord);
  }

  public async updateMany(
    inputs: UpdateProgressionStateInput[],
    options?: RepositoryOptions
  ): Promise<ProgressionStateRecord[]> {
    const executor = resolveExecutor(this.db, options);
    const updatedRows: ProgressionStateRecord[] = [];

    for (const input of inputs) {
      const [row] = await executor
        .update(progressionStates)
        .set({
          currentWeightLbs: input.currentWeightLbs.toString(),
          lastCompletedWeightLbs:
            input.lastCompletedWeightLbs === null ? null : input.lastCompletedWeightLbs.toString(),
          consecutiveFailures: input.consecutiveFailures,
          lastEffortFeedback: input.lastEffortFeedback,
          lastPerformedAt: input.lastPerformedAt,
          updatedAt: new Date()
        })
        .where(
          and(
            eq(progressionStates.userId, input.userId),
            eq(progressionStates.exerciseId, input.exerciseId)
          )
        )
        .returning();

      if (!row) {
        throw new Error(
          `Progression state for user ${input.userId} and exercise ${input.exerciseId} was not found.`
        );
      }

      updatedRows.push(mapProgressionStateRecord(row));
    }

    return updatedRows;
  }
}
