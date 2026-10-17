import { trainingBlocks } from "@fitness/db";
import { randomUUID } from "node:crypto";
import { and, desc, eq, resolveExecutor } from "../db/drizzle-helpers.js";
import type { RepositoryOptions } from "../../repositories/models/persistence-context.js";
import type {
  CreateTrainingBlockInput,
  TrainingBlockRecord,
  TrainingBlockRepository,
  UpdateTrainingBlockInput
} from "../../repositories/interfaces/training-block.repository.js";

function mapRow(row: typeof trainingBlocks.$inferSelect): TrainingBlockRecord {
  return {
    id: row.id,
    userId: row.userId,
    programId: row.programId,
    programTrainingContextId: row.programTrainingContextId ?? null,
    name: row.name,
    goalType: (row.goalType as any) ?? null,
    source: "manual",
    status: row.status as any,
    startDate: row.startDate,
    plannedWeeks: row.plannedWeeks,
    targetWorkoutsPerWeek: row.targetWorkoutsPerWeek,
    progressionStyle: (row.progressionStyle as any) ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

export class DrizzleTrainingBlockRepository implements TrainingBlockRepository {
  public constructor(private readonly db: any) {}

  public async findActiveByUserProgram(
    input: { userId: string; programId: string },
    options?: RepositoryOptions
  ): Promise<TrainingBlockRecord | null> {
    const executor = resolveExecutor(this.db, options);
    const [row] = await executor
      .select()
      .from(trainingBlocks)
      .where(
        and(
          eq(trainingBlocks.userId, input.userId),
          eq(trainingBlocks.programId, input.programId),
          eq(trainingBlocks.status, "active")
        )
      )
      .orderBy(desc(trainingBlocks.updatedAt))
      .limit(1);

    return row ? mapRow(row) : null;
  }

  public async create(input: CreateTrainingBlockInput, options?: RepositoryOptions): Promise<TrainingBlockRecord> {
    const executor = resolveExecutor(this.db, options);

    const [row] = await executor
      .insert(trainingBlocks)
      .values({
        id: randomUUID(),
        userId: input.userId,
        programId: input.programId,
        programTrainingContextId: input.programTrainingContextId ?? null,
        name: input.name,
        goalType: input.goalType,
        source: input.source,
        status: input.status,
        startDate: input.startDate,
        plannedWeeks: input.plannedWeeks,
        targetWorkoutsPerWeek: input.targetWorkoutsPerWeek,
        progressionStyle: input.progressionStyle
      })
      .returning();

    if (!row) {
      throw new Error("Unable to create training block.");
    }

    return mapRow(row);
  }

  public async updateById(
    id: string,
    input: UpdateTrainingBlockInput,
    options?: RepositoryOptions
  ): Promise<TrainingBlockRecord> {
    const executor = resolveExecutor(this.db, options);

    const [row] = await executor
      .update(trainingBlocks)
      .set({
        ...(input.programTrainingContextId !== undefined ? { programTrainingContextId: input.programTrainingContextId } : {}),
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.goalType !== undefined ? { goalType: input.goalType } : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
        ...(input.plannedWeeks !== undefined ? { plannedWeeks: input.plannedWeeks } : {}),
        ...(input.targetWorkoutsPerWeek !== undefined ? { targetWorkoutsPerWeek: input.targetWorkoutsPerWeek } : {}),
        ...(input.progressionStyle !== undefined ? { progressionStyle: input.progressionStyle } : {}),
        updatedAt: new Date()
      })
      .where(eq(trainingBlocks.id, id))
      .returning();

    if (!row) {
      throw new Error("Unable to update training block.");
    }

    return mapRow(row);
  }
}

