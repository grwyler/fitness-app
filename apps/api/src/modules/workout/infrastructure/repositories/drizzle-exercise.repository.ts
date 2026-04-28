import {
  exercises,
  programs,
  workoutTemplateExerciseEntries,
  workoutTemplates
} from "@fitness/db";
import type { ExerciseRepository } from "../../repositories/interfaces/exercise.repository.js";
import type { RepositoryOptions } from "../../repositories/models/persistence-context.js";
import type {
  ExerciseRecord,
  WorkoutTemplateDefinition,
  WorkoutTemplateRecord
} from "../../repositories/models/exercise.persistence.js";
import type { ExerciseProgressionSeedRecord } from "../../repositories/models/progression-state.persistence.js";
import {
  and,
  asc,
  eq,
  inArray,
  normalizeNumeric,
  resolveExecutor
} from "../db/drizzle-helpers.js";

function mapExerciseRecord(row: typeof exercises.$inferSelect): ExerciseRecord {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    movementPattern: row.movementPattern,
    primaryMuscleGroup: row.primaryMuscleGroup,
    equipmentType: row.equipmentType,
    defaultIncrementLbs: normalizeNumeric(row.defaultIncrementLbs),
    isActive: row.isActive,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

function mapWorkoutTemplateRecord(row: typeof workoutTemplates.$inferSelect & { programName: string }): WorkoutTemplateRecord {
  return {
    id: row.id,
    programId: row.programId,
    programName: row.programName,
    name: row.name,
    category: row.category,
    sequenceOrder: row.sequenceOrder,
    estimatedDurationMinutes: row.estimatedDurationMinutes,
    isActive: row.isActive,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

export class DrizzleExerciseRepository implements ExerciseRepository {
  public constructor(private readonly db: any) {}

  public async listActive(options?: RepositoryOptions): Promise<ExerciseRecord[]> {
    const executor = resolveExecutor(this.db, options);
    const rows = await executor
      .select()
      .from(exercises)
      .where(eq(exercises.isActive, true))
      .orderBy(asc(exercises.name));

    return rows.map(mapExerciseRecord);
  }

  public async findTemplateDefinitionById(
    templateId: string,
    options?: RepositoryOptions
  ): Promise<WorkoutTemplateDefinition | null> {
    const executor = resolveExecutor(this.db, options);
    const templateRows = await executor
      .select({
        id: workoutTemplates.id,
        programId: workoutTemplates.programId,
        programName: programs.name,
        name: workoutTemplates.name,
        category: workoutTemplates.category,
        sequenceOrder: workoutTemplates.sequenceOrder,
        estimatedDurationMinutes: workoutTemplates.estimatedDurationMinutes,
        isActive: workoutTemplates.isActive,
        createdAt: workoutTemplates.createdAt,
        updatedAt: workoutTemplates.updatedAt
      })
      .from(workoutTemplates)
      .innerJoin(programs, eq(workoutTemplates.programId, programs.id))
      .where(and(eq(workoutTemplates.id, templateId), eq(workoutTemplates.isActive, true)));

    const templateRow = templateRows[0];
    if (!templateRow) {
      return null;
    }

    const exerciseRows = await executor
      .select({
        templateExercise: workoutTemplateExerciseEntries,
        exercise: exercises
      })
      .from(workoutTemplateExerciseEntries)
      .innerJoin(exercises, eq(workoutTemplateExerciseEntries.exerciseId, exercises.id))
      .where(eq(workoutTemplateExerciseEntries.workoutTemplateId, templateId))
      .orderBy(asc(workoutTemplateExerciseEntries.sequenceOrder));

    return {
      template: mapWorkoutTemplateRecord(templateRow),
      exercises: exerciseRows.map((row: any) => ({
        templateExercise: {
          ...row.templateExercise
        },
        exercise: mapExerciseRecord(row.exercise)
      }))
    };
  }

  public async findProgressionSeedsByExerciseIds(
    exerciseIds: string[],
    options?: RepositoryOptions
  ): Promise<ExerciseProgressionSeedRecord[]> {
    if (exerciseIds.length === 0) {
      return [];
    }

    const executor = resolveExecutor(this.db, options);
    const rows = await executor
      .select()
      .from(exercises)
      .where(inArray(exercises.id, exerciseIds));

    return rows.map((row: any) => ({
      exerciseId: row.id,
      exerciseName: row.name,
      exerciseCategory: row.category,
      defaultStartingWeightLbs: normalizeNumeric(row.defaultStartingWeightLbs),
      incrementLbs: normalizeNumeric(row.defaultIncrementLbs)
    }));
  }

  public async findActiveTemplatesByProgramId(
    programId: string,
    options?: RepositoryOptions
  ): Promise<WorkoutTemplateRecord[]> {
    const executor = resolveExecutor(this.db, options);
    const rows = await executor
      .select({
        id: workoutTemplates.id,
        programId: workoutTemplates.programId,
        programName: programs.name,
        name: workoutTemplates.name,
        category: workoutTemplates.category,
        sequenceOrder: workoutTemplates.sequenceOrder,
        estimatedDurationMinutes: workoutTemplates.estimatedDurationMinutes,
        isActive: workoutTemplates.isActive,
        createdAt: workoutTemplates.createdAt,
        updatedAt: workoutTemplates.updatedAt
      })
      .from(workoutTemplates)
      .innerJoin(programs, eq(workoutTemplates.programId, programs.id))
      .where(and(eq(workoutTemplates.programId, programId), eq(workoutTemplates.isActive, true)))
      .orderBy(asc(workoutTemplates.sequenceOrder));

    return rows.map(mapWorkoutTemplateRecord);
  }

  public async findByIds(
    exerciseIds: string[],
    options?: RepositoryOptions
  ): Promise<ExerciseRecord[]> {
    if (exerciseIds.length === 0) {
      return [];
    }

    const executor = resolveExecutor(this.db, options);
    const rows = await executor
      .select()
      .from(exercises)
      .where(inArray(exercises.id, exerciseIds));

    return rows.map(mapExerciseRecord);
  }
}
