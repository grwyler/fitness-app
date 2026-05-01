import { progressionStatesV2 } from "@fitness/db";
import { randomUUID } from "node:crypto";
import type { ProgressionStateV2Repository } from "../../repositories/interfaces/progression-state-v2.repository.js";
import type { RepositoryOptions } from "../../repositories/models/persistence-context.js";
import type {
  CreateProgressionStateV2Input,
  ProgressionStateV2Record,
  UpdateProgressionStateV2Input
} from "../../repositories/models/progression-state-v2.persistence.js";
import {
  and,
  eq,
  inArray,
  normalizeNullableNumeric,
  normalizeNumeric,
  resolveExecutor
} from "../db/drizzle-helpers.js";

function mapProgressionStateV2Record(row: typeof progressionStatesV2.$inferSelect): ProgressionStateV2Record {
  return {
    id: row.id,
    userId: row.userId,
    workoutTemplateExerciseEntryId: row.workoutTemplateExerciseEntryId,
    currentWeightLbs: normalizeNumeric(row.currentWeightLbs),
    lastCompletedWeightLbs: normalizeNullableNumeric(row.lastCompletedWeightLbs),
    repGoal: row.repGoal,
    repRangeMin: row.repRangeMin,
    repRangeMax: row.repRangeMax,
    consecutiveFailures: row.consecutiveFailures,
    lastEffortFeedback: row.lastEffortFeedback,
    lastPerformedAt: row.lastPerformedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

export class DrizzleProgressionStateV2Repository implements ProgressionStateV2Repository {
  public constructor(private readonly db: any) {}

  public async findByUserIdAndTemplateEntryIds(
    userId: string,
    workoutTemplateExerciseEntryIds: string[],
    options?: RepositoryOptions
  ): Promise<ProgressionStateV2Record[]> {
    if (workoutTemplateExerciseEntryIds.length === 0) {
      return [];
    }

    const executor = resolveExecutor(this.db, options);
    const rows = await executor
      .select()
      .from(progressionStatesV2)
      .where(
        and(
          eq(progressionStatesV2.userId, userId),
          inArray(progressionStatesV2.workoutTemplateExerciseEntryId, workoutTemplateExerciseEntryIds)
        )
      );

    return rows.map(mapProgressionStateV2Record);
  }

  public async createMany(
    inputs: CreateProgressionStateV2Input[],
    options?: RepositoryOptions
  ): Promise<ProgressionStateV2Record[]> {
    if (inputs.length === 0) {
      return [];
    }

    const executor = resolveExecutor(this.db, options);
    const rows = await executor
      .insert(progressionStatesV2)
      .values(
        inputs.map((input) => ({
          id: randomUUID(),
          ...input,
          currentWeightLbs: input.currentWeightLbs.toString(),
          lastCompletedWeightLbs:
            input.lastCompletedWeightLbs === null ? null : input.lastCompletedWeightLbs.toString()
        }))
      )
      .returning();

    return rows.map(mapProgressionStateV2Record);
  }

  public async updateMany(
    inputs: UpdateProgressionStateV2Input[],
    options?: RepositoryOptions
  ): Promise<ProgressionStateV2Record[]> {
    const executor = resolveExecutor(this.db, options);
    const updatedRows: ProgressionStateV2Record[] = [];

    for (const input of inputs) {
      const [row] = await executor
        .update(progressionStatesV2)
        .set({
          currentWeightLbs: input.currentWeightLbs.toString(),
          lastCompletedWeightLbs:
            input.lastCompletedWeightLbs === null ? null : input.lastCompletedWeightLbs.toString(),
          repGoal: input.repGoal,
          repRangeMin: input.repRangeMin,
          repRangeMax: input.repRangeMax,
          consecutiveFailures: input.consecutiveFailures,
          lastEffortFeedback: input.lastEffortFeedback,
          lastPerformedAt: input.lastPerformedAt,
          updatedAt: new Date()
        })
        .where(
          and(
            eq(progressionStatesV2.userId, input.userId),
            eq(progressionStatesV2.workoutTemplateExerciseEntryId, input.workoutTemplateExerciseEntryId)
          )
        )
        .returning();

      if (!row) {
        throw new Error(
          `Progression state v2 for user ${input.userId} and template entry ${input.workoutTemplateExerciseEntryId} was not found.`
        );
      }

      updatedRows.push(mapProgressionStateV2Record(row));
    }

    return updatedRows;
  }
}

