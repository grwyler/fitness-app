import { randomUUID } from "node:crypto";
import {
  exercises,
  programs,
  userProgramEnrollments,
  workoutTemplateExerciseEntries,
  workoutTemplates
} from "@fitness/db";
import type { ProgramRepository } from "../../repositories/interfaces/program.repository.js";
import type { EnrollmentRecord } from "../../repositories/models/enrollment.persistence.js";
import type { RepositoryOptions } from "../../repositories/models/persistence-context.js";
import type {
  CreateEnrollmentInput,
  ProgramDefinition,
  ProgramRecord,
  ProgramTemplateRecord
} from "../../repositories/models/program.persistence.js";
import {
  and,
  asc,
  eq,
  inArray,
  resolveExecutor,
  sql
} from "../db/drizzle-helpers.js";

function mapProgramRecord(row: typeof programs.$inferSelect): ProgramRecord {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    daysPerWeek: row.daysPerWeek,
    sessionDurationMinutes: row.sessionDurationMinutes,
    difficultyLevel: row.difficultyLevel,
    isActive: row.isActive,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

function mapEnrollmentRecord(row: typeof userProgramEnrollments.$inferSelect): EnrollmentRecord {
  return {
    id: row.id,
    userId: row.userId,
    programId: row.programId,
    status: row.status,
    startedAt: row.startedAt,
    completedAt: row.completedAt,
    currentWorkoutTemplateId: row.currentWorkoutTemplateId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

export class DrizzleProgramRepository implements ProgramRepository {
  public constructor(private readonly db: any) {}

  public async listActive(options?: RepositoryOptions): Promise<ProgramDefinition[]> {
    const executor = resolveExecutor(this.db, options);
    const programRows = await executor
      .select()
      .from(programs)
      .where(and(eq(programs.isActive, true), sql`${programs.deletedAt} is null`))
      .orderBy(asc(programs.createdAt));

    return this.loadDefinitions(programRows, options);
  }

  public async findActiveById(
    programId: string,
    options?: RepositoryOptions
  ): Promise<ProgramDefinition | null> {
    const executor = resolveExecutor(this.db, options);
    const programRows = await executor
      .select()
      .from(programs)
      .where(
        and(eq(programs.id, programId), eq(programs.isActive, true), sql`${programs.deletedAt} is null`)
      )
      .limit(1);

    const [definition] = await this.loadDefinitions(programRows, options);
    return definition ?? null;
  }

  public async createEnrollment(
    input: CreateEnrollmentInput,
    options?: RepositoryOptions
  ): Promise<EnrollmentRecord> {
    const executor = resolveExecutor(this.db, options);
    const [row] = await executor
      .insert(userProgramEnrollments)
      .values({
        id: randomUUID(),
        userId: input.userId,
        programId: input.programId,
        status: "active",
        startedAt: input.startedAt,
        completedAt: null,
        currentWorkoutTemplateId: input.currentWorkoutTemplateId
      })
      .returning();

    if (!row) {
      throw new Error("Program enrollment could not be created.");
    }

    return mapEnrollmentRecord(row);
  }

  private async loadDefinitions(
    programRows: Array<typeof programs.$inferSelect>,
    options?: RepositoryOptions
  ): Promise<ProgramDefinition[]> {
    if (programRows.length === 0) {
      return [];
    }

    const executor = resolveExecutor(this.db, options);
    const programIds = programRows.map((row) => row.id);
    const templateRows = await executor
      .select()
      .from(workoutTemplates)
      .where(
        and(
          inArray(workoutTemplates.programId, programIds),
          eq(workoutTemplates.isActive, true),
          sql`${workoutTemplates.deletedAt} is null`
        )
      )
      .orderBy(asc(workoutTemplates.sequenceOrder));

    const templateIds = templateRows.map((row: typeof workoutTemplates.$inferSelect) => row.id);
    const exerciseRows =
      templateIds.length === 0
        ? []
        : await executor
            .select({
              templateExercise: workoutTemplateExerciseEntries,
              exercise: exercises
            })
            .from(workoutTemplateExerciseEntries)
            .innerJoin(exercises, eq(workoutTemplateExerciseEntries.exerciseId, exercises.id))
            .where(inArray(workoutTemplateExerciseEntries.workoutTemplateId, templateIds))
            .orderBy(asc(workoutTemplateExerciseEntries.sequenceOrder));

    const exercisesByTemplateId = new Map<string, ProgramTemplateRecord["exercises"]>();
    for (const row of exerciseRows) {
      const existing = exercisesByTemplateId.get(row.templateExercise.workoutTemplateId) ?? [];
      existing.push({
        id: row.templateExercise.id,
        exerciseId: row.exercise.id,
        exerciseName: row.exercise.name,
        category: row.exercise.category,
        sequenceOrder: row.templateExercise.sequenceOrder,
        targetSets: row.templateExercise.targetSets,
        targetReps: row.templateExercise.targetReps,
        restSeconds: row.templateExercise.restSeconds
      });
      exercisesByTemplateId.set(row.templateExercise.workoutTemplateId, existing);
    }

    const templatesByProgramId = new Map<string, ProgramTemplateRecord[]>();
    for (const row of templateRows) {
      const existing = templatesByProgramId.get(row.programId) ?? [];
      existing.push({
        id: row.id,
        programId: row.programId,
        name: row.name,
        sequenceOrder: row.sequenceOrder,
        estimatedDurationMinutes: row.estimatedDurationMinutes,
        exercises: exercisesByTemplateId.get(row.id) ?? []
      });
      templatesByProgramId.set(row.programId, existing);
    }

    return programRows.map((row) => ({
      program: mapProgramRecord(row),
      templates: templatesByProgramId.get(row.id) ?? []
    }));
  }
}
