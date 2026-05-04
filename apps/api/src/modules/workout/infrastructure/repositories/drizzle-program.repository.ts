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
  CreateCustomProgramInput,
  CreateEnrollmentInput,
  ProgramDefinition,
  ProgramRecord,
  ProgramTemplateRecord,
  UpdateCustomProgramInput
} from "../../repositories/models/program.persistence.js";
import { WorkoutApplicationError } from "../../application/errors/workout-application.error.js";
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
    userId: row.userId,
    source: row.source,
    name: row.name,
    description: row.description,
    daysPerWeek: row.daysPerWeek,
    sessionDurationMinutes: row.sessionDurationMinutes,
    difficultyLevel: row.difficultyLevel,
    trainingGoal: row.trainingGoal ?? null,
    metadata: (row as any).metadata ?? null,
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

  public async listActive(userId: string, options?: RepositoryOptions): Promise<ProgramDefinition[]> {
    const executor = resolveExecutor(this.db, options);
    const programRows = await executor
      .select()
      .from(programs)
      .where(
        and(
          eq(programs.isActive, true),
          sql`${programs.deletedAt} is null`,
          sql`(${programs.source} = 'predefined' or ${programs.userId} = ${userId})`
        )
      )
      .orderBy(asc(programs.createdAt));

    return this.loadDefinitions(programRows, options);
  }

  public async findActiveById(
    programId: string,
    userId: string,
    options?: RepositoryOptions
  ): Promise<ProgramDefinition | null> {
    const executor = resolveExecutor(this.db, options);
    const programRows = await executor
      .select()
      .from(programs)
      .where(
        and(
          eq(programs.id, programId),
          eq(programs.isActive, true),
          sql`${programs.deletedAt} is null`,
          sql`(${programs.source} = 'predefined' or ${programs.userId} = ${userId})`
        )
      )
      .limit(1);

    const [definition] = await this.loadDefinitions(programRows, options);
    return definition ?? null;
  }

  public async createCustomProgram(
    input: CreateCustomProgramInput,
    options?: RepositoryOptions
  ): Promise<ProgramDefinition> {
    const executor = resolveExecutor(this.db, options);
    const exerciseIds = [...new Set(input.workouts.flatMap((workout) => workout.exercises.map((exercise) => exercise.exerciseId)))];
    const activeExerciseRows =
      exerciseIds.length === 0
        ? []
        : await executor
            .select({ id: exercises.id })
            .from(exercises)
            .where(and(inArray(exercises.id, exerciseIds), eq(exercises.isActive, true)));

    if (activeExerciseRows.length !== exerciseIds.length) {
      throw new Error("One or more exercises in the custom program could not be found.");
    }

    const [programRow] = await executor
      .insert(programs)
      .values({
        id: randomUUID(),
        userId: input.userId,
        source: "custom",
        name: input.name,
        description: input.description,
        daysPerWeek: input.workouts.length,
        sessionDurationMinutes: 60,
        difficultyLevel: "beginner",
        trainingGoal: null,
        isActive: true,
        deletedAt: null,
        createdAt: input.createdAt,
        updatedAt: input.createdAt
      })
      .returning();

    if (!programRow) {
      throw new Error("Custom program could not be created.");
    }

    for (const workout of input.workouts) {
      const [templateRow] = await executor
        .insert(workoutTemplates)
        .values({
          id: randomUUID(),
          programId: programRow.id,
          name: workout.name,
          category: "Full Body",
          sequenceOrder: workout.sequenceOrder,
          estimatedDurationMinutes: null,
          isActive: true,
          deletedAt: null,
          createdAt: input.createdAt,
          updatedAt: input.createdAt
        })
        .returning();

      if (!templateRow) {
        throw new Error("Custom program workout could not be created.");
      }

      if (workout.exercises.length > 0) {
        await executor.insert(workoutTemplateExerciseEntries).values(
          workout.exercises.map((exercise, index) => ({
            id: randomUUID(),
            workoutTemplateId: templateRow.id,
            exerciseId: exercise.exerciseId,
            sequenceOrder: index + 1,
            targetSets: exercise.targetSets,
            targetReps: exercise.targetReps,
            repRangeMin: exercise.repRangeMin ?? null,
            repRangeMax: exercise.repRangeMax ?? null,
            restSeconds: exercise.restSeconds,
            progressionStrategy: exercise.progressionStrategy ?? null,
            createdAt: input.createdAt,
            updatedAt: input.createdAt
          }))
        );
      }
    }

    const definition = await this.findActiveById(programRow.id, input.userId, options);
    if (!definition) {
      throw new Error("Created custom program could not be loaded.");
    }

    return definition;
  }

  public async updateCustomProgram(
    input: UpdateCustomProgramInput,
    options?: RepositoryOptions
  ): Promise<ProgramDefinition | null> {
    const executor = resolveExecutor(this.db, options);
    const [programRow] = await executor
      .select()
      .from(programs)
      .where(
        and(
          eq(programs.id, input.programId),
          eq(programs.userId, input.userId),
          eq(programs.source, "custom"),
          eq(programs.isActive, true),
          sql`${programs.deletedAt} is null`
        )
      )
      .limit(1);

    if (!programRow) {
      return null;
    }

    const exerciseIds = [...new Set(input.workouts.flatMap((workout) => workout.exercises.map((exercise) => exercise.exerciseId)))];
    const activeExerciseRows =
      exerciseIds.length === 0
        ? []
        : await executor
            .select({ id: exercises.id })
            .from(exercises)
            .where(and(inArray(exercises.id, exerciseIds), eq(exercises.isActive, true)));

    if (activeExerciseRows.length !== exerciseIds.length) {
      throw new Error("One or more exercises in the custom program could not be found.");
    }

    await executor
      .update(programs)
      .set({
        name: input.name,
        description: input.description,
        daysPerWeek: input.workouts.length,
        updatedAt: input.updatedAt
      })
      .where(eq(programs.id, input.programId));

    const existingTemplateRows = await executor
      .select()
      .from(workoutTemplates)
      .where(eq(workoutTemplates.programId, input.programId))
      .orderBy(asc(workoutTemplates.sequenceOrder));

    const templatesBySequenceOrder = new Map<number, typeof workoutTemplates.$inferSelect>();
    for (const templateRow of existingTemplateRows) {
      templatesBySequenceOrder.set(templateRow.sequenceOrder, templateRow);
    }

    const activeTemplateIds: string[] = [];
    for (const workout of input.workouts) {
      const existingTemplate = templatesBySequenceOrder.get(workout.sequenceOrder);
      const templateId = existingTemplate?.id ?? randomUUID();
      activeTemplateIds.push(templateId);

      if (existingTemplate) {
        await executor
          .update(workoutTemplates)
          .set({
            name: workout.name,
            category: "Full Body",
            estimatedDurationMinutes: null,
            isActive: true,
            deletedAt: null,
            updatedAt: input.updatedAt
          })
          .where(eq(workoutTemplates.id, templateId));
      } else {
        await executor.insert(workoutTemplates).values({
          id: templateId,
          programId: input.programId,
          name: workout.name,
          category: "Full Body",
          sequenceOrder: workout.sequenceOrder,
          estimatedDurationMinutes: null,
          isActive: true,
          deletedAt: null,
          createdAt: input.updatedAt,
          updatedAt: input.updatedAt
        });
      }

      const existingEntryRows = (await executor
        .select()
        .from(workoutTemplateExerciseEntries)
        .where(
          and(
            eq(workoutTemplateExerciseEntries.workoutTemplateId, templateId),
            sql`${workoutTemplateExerciseEntries.deletedAt} is null`
          )
        )
        .orderBy(asc(workoutTemplateExerciseEntries.sequenceOrder))) as Array<
        typeof workoutTemplateExerciseEntries.$inferSelect
      >;

      const existingById = new Map(
        existingEntryRows.map((row: typeof workoutTemplateExerciseEntries.$inferSelect) => [row.id, row])
      );
      const availableByExerciseId = new Map<string, string[]>();
      for (const entry of existingEntryRows) {
        const existing = availableByExerciseId.get(entry.exerciseId) ?? [];
        existing.push(entry.id);
        availableByExerciseId.set(entry.exerciseId, existing);
      }

      const usedEntryIds = new Set<string>();
      const updateInputs: Array<{
        id: string;
        sequenceOrder: number;
        targetSets: number;
        targetReps: number;
        repRangeMin: number | null;
        repRangeMax: number | null;
        restSeconds: number | null;
        progressionStrategy: string | null;
      }> = [];
      const insertInputs: Array<typeof workoutTemplateExerciseEntries.$inferInsert> = [];

      for (const [index, exercise] of workout.exercises.entries()) {
        const desiredEntryId = exercise.workoutTemplateExerciseEntryId ?? null;

        if (desiredEntryId) {
          const existingEntry = existingById.get(desiredEntryId);
          if (!existingEntry) {
            throw new WorkoutApplicationError(
              "VALIDATION_ERROR",
              "One or more workoutTemplateExerciseEntryId values do not belong to this workout."
            );
          }

          if (existingEntry.exerciseId !== exercise.exerciseId) {
            throw new WorkoutApplicationError(
              "VALIDATION_ERROR",
              "One or more workoutTemplateExerciseEntryId values do not match the selected exercise."
            );
          }

          if (usedEntryIds.has(desiredEntryId)) {
            throw new WorkoutApplicationError(
              "VALIDATION_ERROR",
              "Each workoutTemplateExerciseEntryId may only be used once."
            );
          }

          usedEntryIds.add(desiredEntryId);
          updateInputs.push({
            id: desiredEntryId,
            sequenceOrder: index + 1,
            targetSets: exercise.targetSets,
            targetReps: exercise.targetReps,
            repRangeMin: exercise.repRangeMin ?? null,
            repRangeMax: exercise.repRangeMax ?? null,
            restSeconds: exercise.restSeconds,
            progressionStrategy: exercise.progressionStrategy ?? null
          });
          continue;
        }

        const available = availableByExerciseId.get(exercise.exerciseId) ?? [];
        const fallbackEntryId = (() => {
          while (available.length > 0) {
            const candidate = available.shift();
            if (!candidate) {
              continue;
            }

            if (!usedEntryIds.has(candidate)) {
              return candidate;
            }
          }

          return null;
        })();

        if (fallbackEntryId) {
          usedEntryIds.add(fallbackEntryId);
          updateInputs.push({
            id: fallbackEntryId,
            sequenceOrder: index + 1,
            targetSets: exercise.targetSets,
            targetReps: exercise.targetReps,
            repRangeMin: exercise.repRangeMin ?? null,
            repRangeMax: exercise.repRangeMax ?? null,
            restSeconds: exercise.restSeconds,
            progressionStrategy: exercise.progressionStrategy ?? null
          });
          continue;
        }

        insertInputs.push({
          id: randomUUID(),
          workoutTemplateId: templateId,
          exerciseId: exercise.exerciseId,
          sequenceOrder: index + 1,
          targetSets: exercise.targetSets,
          targetReps: exercise.targetReps,
          repRangeMin: exercise.repRangeMin ?? null,
          repRangeMax: exercise.repRangeMax ?? null,
          restSeconds: exercise.restSeconds,
          progressionStrategy: exercise.progressionStrategy ?? null,
          deletedAt: null,
          createdAt: input.updatedAt,
          updatedAt: input.updatedAt
        });
      }

      const removedEntries = existingEntryRows.filter(
        (row: typeof workoutTemplateExerciseEntries.$inferSelect) => !usedEntryIds.has(row.id)
      );
      for (const [removedIndex, removed] of removedEntries.entries()) {
        await executor
          .update(workoutTemplateExerciseEntries)
          .set({
            sequenceOrder: 10_000 + removedIndex + 1,
            deletedAt: input.updatedAt,
            updatedAt: input.updatedAt
          })
          .where(eq(workoutTemplateExerciseEntries.id, removed.id));
      }

      for (const [tempIndex, update] of updateInputs.entries()) {
        await executor
          .update(workoutTemplateExerciseEntries)
          .set({
            sequenceOrder: 20_000 + tempIndex + 1,
            updatedAt: input.updatedAt
          })
          .where(eq(workoutTemplateExerciseEntries.id, update.id));
      }

      if (insertInputs.length > 0) {
        await executor.insert(workoutTemplateExerciseEntries).values(insertInputs);
      }

      for (const update of updateInputs) {
        await executor
          .update(workoutTemplateExerciseEntries)
          .set({
            sequenceOrder: update.sequenceOrder,
            targetSets: update.targetSets,
            targetReps: update.targetReps,
            repRangeMin: update.repRangeMin,
            repRangeMax: update.repRangeMax,
            restSeconds: update.restSeconds,
            progressionStrategy: update.progressionStrategy,
            updatedAt: input.updatedAt
          })
          .where(eq(workoutTemplateExerciseEntries.id, update.id));
      }
    }

    const inactiveTemplateIds = existingTemplateRows
      .filter((templateRow: typeof workoutTemplates.$inferSelect) => !activeTemplateIds.includes(templateRow.id))
      .map((templateRow: typeof workoutTemplates.$inferSelect) => templateRow.id);

    if (inactiveTemplateIds.length > 0) {
      await executor
        .update(workoutTemplates)
        .set({
          isActive: false,
          deletedAt: input.updatedAt,
          updatedAt: input.updatedAt
        })
        .where(inArray(workoutTemplates.id, inactiveTemplateIds));

      await executor
        .update(userProgramEnrollments)
        .set({
          currentWorkoutTemplateId: activeTemplateIds[0],
          updatedAt: input.updatedAt
        })
        .where(
          and(
            eq(userProgramEnrollments.userId, input.userId),
            eq(userProgramEnrollments.programId, input.programId),
            eq(userProgramEnrollments.status, "active"),
            inArray(userProgramEnrollments.currentWorkoutTemplateId, inactiveTemplateIds)
          )
        );
    }

    const definition = await this.findActiveById(input.programId, input.userId, options);
    if (!definition) {
      throw new Error("Updated custom program could not be loaded.");
    }

    return definition;
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
            .where(
              and(
                inArray(workoutTemplateExerciseEntries.workoutTemplateId, templateIds),
                sql`${workoutTemplateExerciseEntries.deletedAt} is null`
              )
            )
            .orderBy(asc(workoutTemplateExerciseEntries.sequenceOrder));

    const exercisesByTemplateId = new Map<string, ProgramTemplateRecord["exercises"]>();
    for (const row of exerciseRows) {
      const existing = exercisesByTemplateId.get(row.templateExercise.workoutTemplateId) ?? [];
      existing.push({
        id: row.templateExercise.id,
        exerciseId: row.exercise.id,
        exerciseName: row.exercise.name,
        category: row.exercise.category,
        movementPattern: row.exercise.movementPattern ?? null,
        primaryMuscleGroup: row.exercise.primaryMuscleGroup ?? null,
        equipmentType: row.exercise.equipmentType ?? null,
        isBodyweight: Boolean(row.exercise.isBodyweight),
        sequenceOrder: row.templateExercise.sequenceOrder,
        targetSets: row.templateExercise.targetSets,
        targetReps: row.templateExercise.targetReps,
        repRangeMin: row.templateExercise.repRangeMin ?? null,
        repRangeMax: row.templateExercise.repRangeMax ?? null,
        restSeconds: row.templateExercise.restSeconds,
        progressionStrategy: row.templateExercise.progressionStrategy ?? null
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
        category: row.category,
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
