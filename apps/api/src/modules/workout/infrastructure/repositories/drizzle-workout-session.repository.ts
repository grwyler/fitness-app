import { exerciseEntries, progressionStatesV2, sets, workoutSessions } from "@fitness/db";
import { randomUUID } from "node:crypto";
import type { WorkoutSessionRepository } from "../../repositories/interfaces/workout-session.repository.js";
import type { RepositoryOptions } from "../../repositories/models/persistence-context.js";
import type {
  AppendCustomExerciseInput,
  AppendWorkoutSetInput,
  CancelWorkoutSessionPersistenceInput,
  CompletedWorkoutProgressionRecord,
  CompleteWorkoutSessionPersistenceInput,
  CreateWorkoutSessionGraphInput,
  DeleteWorkoutSetInput,
  DeleteWorkoutExerciseEntryInput,
  ExerciseEntryRecord,
  PersistExerciseEntryFeedbackInput,
  SkipPendingWorkoutSetsInput,
  SetRecord,
  UpdateLoggedSetInput,
  UpdateWorkoutExerciseEntryInput,
  WorkoutHistorySummaryRecord,
  WorkoutSessionGraph,
  WorkoutSessionRecord,
  WorkoutSetForLoggingRecord
} from "../../repositories/models/workout-session.persistence.js";
import {
  and,
  asc,
  desc,
  eq,
  gte,
  inArray,
  lte,
  normalizeNullableNumeric,
  normalizeNumeric,
  sql,
  resolveExecutor
} from "../db/drizzle-helpers.js";

const workoutSessionCoreColumns = {
  id: workoutSessions.id,
  userId: workoutSessions.userId,
  programId: workoutSessions.programId,
  workoutTemplateId: workoutSessions.workoutTemplateId,
  status: workoutSessions.status,
  startedAt: workoutSessions.startedAt,
  completedAt: workoutSessions.completedAt,
  durationSeconds: workoutSessions.durationSeconds,
  isPartial: workoutSessions.isPartial,
  programNameSnapshot: workoutSessions.programNameSnapshot,
  workoutNameSnapshot: workoutSessions.workoutNameSnapshot,
  createdAt: workoutSessions.createdAt,
  updatedAt: workoutSessions.updatedAt
} as const;

type WorkoutSessionCoreRow = {
  id: string;
  userId: string;
  programId: string;
  workoutTemplateId: string;
  status: WorkoutSessionRecord["status"];
  startedAt: Date | null;
  completedAt: Date | null;
  durationSeconds: number | null;
  isPartial: boolean;
  programNameSnapshot: string;
  workoutNameSnapshot: string;
  createdAt: Date;
  updatedAt: Date;
  userEffortFeedback?: WorkoutSessionRecord["userEffortFeedback"];
  recoveryState?: WorkoutSessionRecord["recoveryState"];
};

function mapWorkoutSessionRecord(row: WorkoutSessionCoreRow): WorkoutSessionRecord {
  return {
    id: row.id,
    userId: row.userId,
    programId: row.programId,
    workoutTemplateId: row.workoutTemplateId,
    status: row.status,
    startedAt: row.startedAt,
    completedAt: row.completedAt,
    durationSeconds: row.durationSeconds,
    isPartial: row.isPartial,
    userEffortFeedback: row.userEffortFeedback ?? null,
    recoveryState: row.recoveryState ?? null,
    programNameSnapshot: row.programNameSnapshot,
    workoutNameSnapshot: row.workoutNameSnapshot,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

function mapExerciseEntryRecord(row: typeof exerciseEntries.$inferSelect): ExerciseEntryRecord {
  return {
    id: row.id,
    workoutSessionId: row.workoutSessionId,
    exerciseId: row.exerciseId,
    workoutTemplateExerciseEntryId: row.workoutTemplateExerciseEntryId ?? null,
    sequenceOrder: row.sequenceOrder,
    targetSets: row.targetSets,
    targetReps: row.targetReps ?? null,
    targetWeightLbs: normalizeNullableNumeric(row.targetWeightLbs),
    targetDurationSeconds: row.targetDurationSeconds ?? null,
    targetDistanceMeters: normalizeNullableNumeric(row.targetDistanceMeters),
    targetRounds: row.targetRounds ?? null,
    restSeconds: row.restSeconds,
    effortFeedback: row.effortFeedback,
    completedAt: row.completedAt,
    exerciseNameSnapshot: row.exerciseNameSnapshot,
    exerciseCategorySnapshot: row.exerciseCategorySnapshot,
    loggingModalitySnapshot: row.loggingModalitySnapshot,
    progressionRuleSnapshot: (row.progressionRuleSnapshot as Record<string, unknown> | null) ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

function mapSetRecord(row: typeof sets.$inferSelect): SetRecord {
  return {
    id: row.id,
    exerciseEntryId: row.exerciseEntryId,
    setNumber: row.setNumber,
    setType: row.setType,
    targetReps: row.targetReps ?? null,
    actualReps: row.actualReps,
    targetWeightLbs: normalizeNullableNumeric(row.targetWeightLbs),
    actualWeightLbs: normalizeNullableNumeric(row.actualWeightLbs),
    targetDurationSeconds: row.targetDurationSeconds ?? null,
    actualDurationSeconds: row.actualDurationSeconds ?? null,
    targetDistanceMeters: normalizeNullableNumeric(row.targetDistanceMeters),
    actualDistanceMeters: normalizeNullableNumeric(row.actualDistanceMeters),
    targetRounds: row.targetRounds ?? null,
    actualRounds: row.actualRounds ?? null,
    status: row.status,
    rir: row.rir ?? null,
    failureStatus: row.failureStatus ?? null,
    completedAt: row.completedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

export class DrizzleWorkoutSessionRepository implements WorkoutSessionRepository {
  public constructor(private readonly db: any) {}

  private applyRepRangeDefaults(exerciseEntries: ExerciseEntryRecord[]): ExerciseEntryRecord[] {
    return exerciseEntries.map((entry) => ({
      ...entry,
      repRangeMin: entry.targetReps ?? null,
      repRangeMax: entry.targetReps ?? null
    }));
  }

  private async loadSessionGraph(
    sessionId: string,
    executor: any
  ): Promise<WorkoutSessionGraph | null> {
    const sessionRows: WorkoutSessionCoreRow[] = await executor
      .select(workoutSessionCoreColumns)
      .from(workoutSessions)
      .where(eq(workoutSessions.id, sessionId))
      .limit(1);
    const sessionRow = sessionRows[0] ?? null;
    if (!sessionRow) {
      return null;
    }

    const exerciseEntryRows = await executor
      .select()
      .from(exerciseEntries)
      .where(eq(exerciseEntries.workoutSessionId, sessionId))
      .orderBy(asc(exerciseEntries.sequenceOrder));

    const setRows =
      exerciseEntryRows.length === 0
        ? []
        : await executor
            .select()
            .from(sets)
            .where(inArray(sets.exerciseEntryId, exerciseEntryRows.map((row: any) => row.id)))
            .orderBy(asc(sets.setNumber));

    const baseExerciseEntries = exerciseEntryRows.map(mapExerciseEntryRecord);

    const templateEntryIds = baseExerciseEntries
      .map((entry: ExerciseEntryRecord) => entry.workoutTemplateExerciseEntryId)
      .filter((id: string | null): id is string => Boolean(id));

    const repRangeByTemplateEntryId: Map<string, { repRangeMin: number; repRangeMax: number }> =
      templateEntryIds.length === 0
        ? new Map<string, { repRangeMin: number; repRangeMax: number }>()
        : new Map(
            (
              await executor
                .select({
                  workoutTemplateExerciseEntryId: progressionStatesV2.workoutTemplateExerciseEntryId,
                  repRangeMin: progressionStatesV2.repRangeMin,
                  repRangeMax: progressionStatesV2.repRangeMax
                })
                .from(progressionStatesV2)
                .where(
                  and(
                    eq(progressionStatesV2.userId, sessionRow.userId),
                    inArray(progressionStatesV2.workoutTemplateExerciseEntryId, templateEntryIds)
                  )
                )
            ).map((row: any) => [
              row.workoutTemplateExerciseEntryId,
              { repRangeMin: row.repRangeMin, repRangeMax: row.repRangeMax }
            ])
          );

    const exerciseEntriesWithRanges = this.applyRepRangeDefaults(baseExerciseEntries).map((entry: ExerciseEntryRecord) => {
      if (!entry.workoutTemplateExerciseEntryId) {
        return entry;
      }

      const repRange = repRangeByTemplateEntryId.get(entry.workoutTemplateExerciseEntryId);
      return repRange
        ? { ...entry, repRangeMin: repRange.repRangeMin, repRangeMax: repRange.repRangeMax }
        : entry;
    });

    return {
      session: mapWorkoutSessionRecord(sessionRow),
      exerciseEntries: exerciseEntriesWithRanges,
      sets: setRows.map(mapSetRecord)
    };
  }

  public async findInProgressByUserId(
    userId: string,
    options?: RepositoryOptions
  ): Promise<WorkoutSessionGraph | null> {
    const executor = resolveExecutor(this.db, options);
    const rows: Array<{ id: string }> = await executor
      .select({ id: workoutSessions.id })
      .from(workoutSessions)
      .where(and(eq(workoutSessions.userId, userId), eq(workoutSessions.status, "in_progress")))
      .limit(1);
    const sessionRow = rows[0] ?? null;

    return sessionRow ? this.loadSessionGraph(sessionRow.id, executor) : null;
  }

  public async findOwnedById(
    userId: string,
    sessionId: string,
    options?: RepositoryOptions
  ): Promise<WorkoutSessionRecord | null> {
    const executor = resolveExecutor(this.db, options);
    const rows: WorkoutSessionCoreRow[] = await executor
      .select(workoutSessionCoreColumns)
      .from(workoutSessions)
      .where(and(eq(workoutSessions.id, sessionId), eq(workoutSessions.userId, userId)))
      .limit(1);
    const row = rows[0] ?? null;

    return row ? mapWorkoutSessionRecord(row) : null;
  }

  public async findOwnedSessionGraphById(
    userId: string,
    sessionId: string,
    options?: RepositoryOptions
  ): Promise<WorkoutSessionGraph | null> {
    const executor = resolveExecutor(this.db, options);
    const rows: Array<{ id: string }> = await executor
      .select({ id: workoutSessions.id })
      .from(workoutSessions)
      .where(and(eq(workoutSessions.id, sessionId), eq(workoutSessions.userId, userId)))
      .limit(1);
    const sessionRow = rows[0] ?? null;

    return sessionRow ? this.loadSessionGraph(sessionId, executor) : null;
  }

  public async findOwnedSetForLogging(
    userId: string,
    setId: string,
    options?: RepositoryOptions
  ): Promise<WorkoutSetForLoggingRecord | null> {
    const executor = resolveExecutor(this.db, options);
    const rows = await executor
      .select({
        set: sets,
        exerciseEntry: exerciseEntries,
        workoutSession: workoutSessions
      })
      .from(sets)
      .innerJoin(exerciseEntries, eq(sets.exerciseEntryId, exerciseEntries.id))
      .innerJoin(workoutSessions, eq(exerciseEntries.workoutSessionId, workoutSessions.id))
      .where(and(eq(sets.id, setId), eq(workoutSessions.userId, userId)));

    const row = rows[0];
    if (!row) {
      return null;
    }

    return {
      set: mapSetRecord(row.set),
      exerciseEntry: mapExerciseEntryRecord(row.exerciseEntry),
      workoutSession: mapWorkoutSessionRecord(row.workoutSession)
    };
  }

  public async createSessionGraph(
    input: CreateWorkoutSessionGraphInput,
    options?: RepositoryOptions
  ): Promise<WorkoutSessionGraph> {
    const executor = resolveExecutor(this.db, options);
    const [sessionRow] = await executor
      .insert(workoutSessions)
      .values({
        id: randomUUID(),
        ...input.session
      })
      .returning();

    const insertedExerciseEntries = [];
    for (const exerciseEntryInput of input.exerciseEntries) {
      const [exerciseEntryRow] = await executor
        .insert(exerciseEntries)
        .values({
          id: randomUUID(),
          ...exerciseEntryInput,
          workoutSessionId: sessionRow.id,
          targetWeightLbs:
            exerciseEntryInput.targetWeightLbs === null ? null : exerciseEntryInput.targetWeightLbs.toString(),
          targetDistanceMeters:
            exerciseEntryInput.targetDistanceMeters === null || exerciseEntryInput.targetDistanceMeters === undefined
              ? null
              : exerciseEntryInput.targetDistanceMeters.toString()
        })
        .returning();

      insertedExerciseEntries.push(exerciseEntryRow);
    }

    const entryIdByPlaceholder = new Map<string, string>();
    insertedExerciseEntries.forEach((exerciseEntryRow: any, index: number) => {
      entryIdByPlaceholder.set(`__EXERCISE_ENTRY_${index}__`, exerciseEntryRow.id);
    });

    const insertedSets = [];
    for (const setInput of input.sets) {
      const [setRow] = await executor
        .insert(sets)
        .values({
          id: randomUUID(),
          ...setInput,
          exerciseEntryId: entryIdByPlaceholder.get(setInput.exerciseEntryId) ?? setInput.exerciseEntryId,
          targetWeightLbs: setInput.targetWeightLbs === null ? null : setInput.targetWeightLbs.toString(),
          actualWeightLbs: setInput.actualWeightLbs === null ? null : setInput.actualWeightLbs.toString(),
          targetDistanceMeters:
            setInput.targetDistanceMeters === null || setInput.targetDistanceMeters === undefined
              ? null
              : setInput.targetDistanceMeters.toString(),
          actualDistanceMeters:
            setInput.actualDistanceMeters === null || setInput.actualDistanceMeters === undefined
              ? null
              : setInput.actualDistanceMeters.toString()
        })
        .returning();

      insertedSets.push(setRow);
    }

    const insertedExerciseEntryRecords = insertedExerciseEntries.map(mapExerciseEntryRecord);
    const repRangeByTemplateEntryId: Map<string, { repRangeMin: number; repRangeMax: number }> =
      insertedExerciseEntryRecords.length === 0
        ? new Map<string, { repRangeMin: number; repRangeMax: number }>()
        : new Map(
            (
              await executor
                .select({
                  workoutTemplateExerciseEntryId: progressionStatesV2.workoutTemplateExerciseEntryId,
                  repRangeMin: progressionStatesV2.repRangeMin,
                  repRangeMax: progressionStatesV2.repRangeMax
                })
                .from(progressionStatesV2)
                .where(
                  and(
                    eq(progressionStatesV2.userId, sessionRow.userId),
                    inArray(
                      progressionStatesV2.workoutTemplateExerciseEntryId,
                      insertedExerciseEntryRecords
                        .map((entry: ExerciseEntryRecord) => entry.workoutTemplateExerciseEntryId)
                        .filter((id: string | null): id is string => Boolean(id))
                    )
                  )
                )
            ).map((row: any) => [
              row.workoutTemplateExerciseEntryId,
              { repRangeMin: row.repRangeMin, repRangeMax: row.repRangeMax }
            ])
          );

    const exerciseEntriesWithRanges = this.applyRepRangeDefaults(insertedExerciseEntryRecords).map((entry: ExerciseEntryRecord) => {
      if (!entry.workoutTemplateExerciseEntryId) {
        return entry;
      }

      const repRange = repRangeByTemplateEntryId.get(entry.workoutTemplateExerciseEntryId);
      return repRange
        ? { ...entry, repRangeMin: repRange.repRangeMin, repRangeMax: repRange.repRangeMax }
        : entry;
    });

    return {
      session: mapWorkoutSessionRecord(sessionRow),
      exerciseEntries: exerciseEntriesWithRanges,
      sets: insertedSets.map(mapSetRecord)
    };
  }

  public async appendCustomExercise(
    input: AppendCustomExerciseInput,
    options?: RepositoryOptions
  ): Promise<WorkoutSessionGraph> {
    const executor = resolveExecutor(this.db, options);
    const [exerciseEntryRow] = await executor
      .insert(exerciseEntries)
      .values({
        id: randomUUID(),
        workoutSessionId: input.sessionId,
        ...input.exerciseEntry,
        targetWeightLbs:
          input.exerciseEntry.targetWeightLbs === null ? null : input.exerciseEntry.targetWeightLbs.toString(),
        targetDistanceMeters:
          input.exerciseEntry.targetDistanceMeters === null || input.exerciseEntry.targetDistanceMeters === undefined
            ? null
            : input.exerciseEntry.targetDistanceMeters.toString()
      })
      .returning();

    if (!exerciseEntryRow) {
      throw new Error(`Exercise entry could not be created for session ${input.sessionId}.`);
    }

    for (const setInput of input.sets) {
      await executor.insert(sets).values({
        id: randomUUID(),
        exerciseEntryId: exerciseEntryRow.id,
        ...setInput,
        targetWeightLbs: setInput.targetWeightLbs === null ? null : setInput.targetWeightLbs.toString(),
        actualWeightLbs: setInput.actualWeightLbs === null ? null : setInput.actualWeightLbs.toString(),
        targetDistanceMeters:
          setInput.targetDistanceMeters === null || setInput.targetDistanceMeters === undefined
            ? null
            : setInput.targetDistanceMeters.toString(),
        actualDistanceMeters:
          setInput.actualDistanceMeters === null || setInput.actualDistanceMeters === undefined
            ? null
            : setInput.actualDistanceMeters.toString()
      });
    }

    const graph = await this.loadSessionGraph(input.sessionId, executor);
    if (!graph) {
      throw new Error(`Workout session ${input.sessionId} could not be reloaded after adding an exercise.`);
    }

    return graph;
  }

  public async updateWorkoutNameSnapshotIfDefault(
    input: {
      sessionId: string;
      workoutNameSnapshot: string;
      expectedCurrentName: string;
    },
    options?: RepositoryOptions
  ): Promise<boolean> {
    const executor = resolveExecutor(this.db, options);
    const result = await executor
      .update(workoutSessions)
      .set({
        workoutNameSnapshot: input.workoutNameSnapshot,
        updatedAt: new Date()
      })
      .where(
        and(
          eq(workoutSessions.id, input.sessionId),
          eq(workoutSessions.workoutNameSnapshot, input.expectedCurrentName)
        )
      );

    const updatedRowCount = Number((result as any)?.rowCount ?? 0);
    return updatedRowCount > 0;
  }

  public async appendWorkoutSet(
    input: AppendWorkoutSetInput,
    options?: RepositoryOptions
  ): Promise<WorkoutSessionGraph> {
    const executor = resolveExecutor(this.db, options);
    const [insertedSet] = await executor
      .insert(sets)
      .values({
        id: randomUUID(),
        exerciseEntryId: input.exerciseEntryId,
        ...input.set,
        targetWeightLbs: input.set.targetWeightLbs === null ? null : input.set.targetWeightLbs.toString(),
        actualWeightLbs: input.set.actualWeightLbs === null ? null : input.set.actualWeightLbs.toString(),
        targetDistanceMeters:
          input.set.targetDistanceMeters === null || input.set.targetDistanceMeters === undefined
            ? null
            : input.set.targetDistanceMeters.toString(),
        actualDistanceMeters:
          input.set.actualDistanceMeters === null || input.set.actualDistanceMeters === undefined
            ? null
            : input.set.actualDistanceMeters.toString()
      })
      .returning();

    if (!insertedSet) {
      throw new Error(`Set could not be created for exercise entry ${input.exerciseEntryId}.`);
    }

    const [exerciseEntryRow] = await executor
      .update(exerciseEntries)
      .set({
        targetSets: input.targetSets,
        updatedAt: new Date()
      })
      .where(eq(exerciseEntries.id, input.exerciseEntryId))
      .returning();

    if (!exerciseEntryRow) {
      throw new Error(`Exercise entry ${input.exerciseEntryId} could not be updated after adding a set.`);
    }

    const graph = await this.loadSessionGraph(exerciseEntryRow.workoutSessionId, executor);
    if (!graph) {
      throw new Error(`Workout session could not be reloaded after adding a set.`);
    }

    return graph;
  }

  public async deleteWorkoutSet(
    input: DeleteWorkoutSetInput,
    options?: RepositoryOptions
  ): Promise<WorkoutSessionGraph> {
    const executor = resolveExecutor(this.db, options);
    const [deletedSet] = await executor
      .delete(sets)
      .where(eq(sets.id, input.setId))
      .returning();

    if (!deletedSet) {
      throw new Error(`Set ${input.setId} was not found for deletion.`);
    }

    const [exerciseEntryRow] = await executor
      .update(exerciseEntries)
      .set({
        targetSets: input.targetSets,
        updatedAt: new Date()
      })
      .where(eq(exerciseEntries.id, input.exerciseEntryId))
      .returning();

    if (!exerciseEntryRow) {
      throw new Error(`Exercise entry ${input.exerciseEntryId} could not be updated after deleting a set.`);
    }

    const graph = await this.loadSessionGraph(exerciseEntryRow.workoutSessionId, executor);
    if (!graph) {
      throw new Error(`Workout session could not be reloaded after deleting a set.`);
    }

    return graph;
  }

  public async updateWorkoutExerciseEntry(
    input: UpdateWorkoutExerciseEntryInput,
    options?: RepositoryOptions
  ): Promise<WorkoutSessionGraph> {
    const executor = resolveExecutor(this.db, options);
    const [exerciseEntryRow] = await executor
      .select()
      .from(exerciseEntries)
      .where(eq(exerciseEntries.id, input.exerciseEntryId))
      .limit(1);

    if (!exerciseEntryRow) {
      throw new Error(`Exercise entry ${input.exerciseEntryId} was not found for update.`);
    }

    const existingSetRows = await executor
      .select()
      .from(sets)
      .where(eq(sets.exerciseEntryId, input.exerciseEntryId))
      .orderBy(asc(sets.setNumber));

    const maxExistingSetNumber = existingSetRows.reduce((maxNumber: number, setRow: any) => Math.max(maxNumber, setRow.setNumber), 0);
    const maxLockedSetNumber = existingSetRows.reduce(
      (maxNumber: number, setRow: any) => (setRow.status === "pending" ? maxNumber : Math.max(maxNumber, setRow.setNumber)),
      0
    );

    if (input.targetSets < maxLockedSetNumber) {
      throw new Error(
        `Cannot reduce targetSets below already-logged sets for exercise entry ${input.exerciseEntryId}.`
      );
    }

    await executor
      .update(exerciseEntries)
      .set({
        targetSets: input.targetSets,
        targetReps: input.targetReps,
        targetWeightLbs: input.targetWeightLbs === null ? null : String(input.targetWeightLbs),
        ...(input.targetDurationSeconds !== undefined ? { targetDurationSeconds: input.targetDurationSeconds } : {}),
        ...(input.targetDistanceMeters !== undefined
          ? { targetDistanceMeters: input.targetDistanceMeters === null ? null : String(input.targetDistanceMeters) }
          : {}),
        ...(input.targetRounds !== undefined ? { targetRounds: input.targetRounds } : {}),
        restSeconds: input.restSeconds,
        updatedAt: new Date()
      })
      .where(eq(exerciseEntries.id, input.exerciseEntryId));

    await executor
      .update(sets)
      .set({
        targetReps: input.targetReps,
        targetWeightLbs: input.targetWeightLbs === null ? null : String(input.targetWeightLbs),
        ...(input.targetDurationSeconds !== undefined ? { targetDurationSeconds: input.targetDurationSeconds } : {}),
        ...(input.targetDistanceMeters !== undefined
          ? { targetDistanceMeters: input.targetDistanceMeters === null ? null : String(input.targetDistanceMeters) }
          : {}),
        ...(input.targetRounds !== undefined ? { targetRounds: input.targetRounds } : {}),
        updatedAt: new Date()
      })
      .where(and(eq(sets.exerciseEntryId, input.exerciseEntryId), eq(sets.status, "pending")));

    if (input.targetSets > maxExistingSetNumber) {
      const missingCount = input.targetSets - maxExistingSetNumber;
      const inserted = await executor
        .insert(sets)
        .values(
          Array.from({ length: missingCount }, (_, index) => {
            const setNumber = maxExistingSetNumber + index + 1;
            return {
              id: randomUUID(),
              exerciseEntryId: input.exerciseEntryId,
              setNumber,
              setType: "working",
              targetReps: input.targetReps,
              actualReps: null,
              targetWeightLbs: input.targetWeightLbs === null ? null : String(input.targetWeightLbs),
              actualWeightLbs: null,
              ...(input.targetDurationSeconds !== undefined ? { targetDurationSeconds: input.targetDurationSeconds } : {}),
              actualDurationSeconds: null,
              ...(input.targetDistanceMeters !== undefined
                ? { targetDistanceMeters: input.targetDistanceMeters === null ? null : String(input.targetDistanceMeters) }
                : {}),
              actualDistanceMeters: null,
              ...(input.targetRounds !== undefined ? { targetRounds: input.targetRounds } : {}),
              actualRounds: null,
              status: "pending",
              rir: null,
              failureStatus: null,
              completedAt: null
            };
          })
        )
        .returning({ id: sets.id });

      if (inserted.length !== missingCount) {
        throw new Error(`Could not append new sets for exercise entry ${input.exerciseEntryId}.`);
      }
    } else if (input.targetSets < maxExistingSetNumber) {
      await executor
        .delete(sets)
        .where(and(eq(sets.exerciseEntryId, input.exerciseEntryId), eq(sets.status, "pending"), gte(sets.setNumber, input.targetSets + 1)));
    }

    const graph = await this.loadSessionGraph(exerciseEntryRow.workoutSessionId, executor);
    if (!graph) {
      throw new Error(`Workout session could not be reloaded after updating an exercise entry.`);
    }

    return graph;
  }

  public async deleteWorkoutExerciseEntry(
    input: DeleteWorkoutExerciseEntryInput,
    options?: RepositoryOptions
  ): Promise<WorkoutSessionGraph> {
    const executor = resolveExecutor(this.db, options);
    const [exerciseEntryRow] = await executor
      .select()
      .from(exerciseEntries)
      .where(eq(exerciseEntries.id, input.exerciseEntryId))
      .limit(1);

    if (!exerciseEntryRow) {
      throw new Error(`Exercise entry ${input.exerciseEntryId} was not found for deletion.`);
    }

    const lockedSets = await executor
      .select({ id: sets.id })
      .from(sets)
      .where(and(eq(sets.exerciseEntryId, input.exerciseEntryId), sql`${sets.status} <> 'pending'`))
      .limit(1);

    if (lockedSets.length > 0) {
      throw new Error(`Cannot delete exercise entry ${input.exerciseEntryId} because it has logged sets.`);
    }

    await executor.delete(sets).where(eq(sets.exerciseEntryId, input.exerciseEntryId));
    await executor.delete(exerciseEntries).where(eq(exerciseEntries.id, input.exerciseEntryId));

    const graph = await this.loadSessionGraph(exerciseEntryRow.workoutSessionId, executor);
    if (!graph) {
      throw new Error(`Workout session could not be reloaded after deleting an exercise entry.`);
    }

    return graph;
  }

  public async updateLoggedSet(
    input: UpdateLoggedSetInput,
    options?: RepositoryOptions
  ): Promise<WorkoutSetForLoggingRecord> {
    const executor = resolveExecutor(this.db, options);
    const [updatedSet] = await executor
      .update(sets)
      .set({
        actualReps: input.actualReps,
        actualWeightLbs: input.actualWeightLbs === null ? null : input.actualWeightLbs.toString(),
        ...(input.actualDurationSeconds !== undefined ? { actualDurationSeconds: input.actualDurationSeconds } : {}),
        ...(input.actualDistanceMeters !== undefined
          ? { actualDistanceMeters: input.actualDistanceMeters === null ? null : input.actualDistanceMeters.toString() }
          : {}),
        ...(input.actualRounds !== undefined ? { actualRounds: input.actualRounds } : {}),
        ...(input.setType !== undefined ? { setType: input.setType } : {}),
        status: input.status,
        completedAt: input.completedAt,
        ...(input.rir !== undefined ? { rir: input.rir } : {}),
        ...(input.failureStatus !== undefined ? { failureStatus: input.failureStatus } : {}),
        updatedAt: new Date()
      })
      .where(eq(sets.id, input.setId))
      .returning();

    if (!updatedSet) {
      throw new Error(`Set ${input.setId} was not found for update.`);
    }

    const rows = await executor
      .select({
        set: sets,
        exerciseEntry: exerciseEntries,
        workoutSession: workoutSessions
      })
      .from(sets)
      .innerJoin(exerciseEntries, eq(sets.exerciseEntryId, exerciseEntries.id))
      .innerJoin(workoutSessions, eq(exerciseEntries.workoutSessionId, workoutSessions.id))
      .where(eq(sets.id, input.setId));

    const row = rows[0];
    if (!row) {
      throw new Error(`Updated set ${input.setId} could not be reloaded.`);
    }

    return {
      set: mapSetRecord(row.set),
      exerciseEntry: mapExerciseEntryRecord(row.exerciseEntry),
      workoutSession: mapWorkoutSessionRecord(row.workoutSession)
    };
  }

  public async persistExerciseEntryFeedback(
    inputs: PersistExerciseEntryFeedbackInput[],
    options?: RepositoryOptions
  ): Promise<void> {
    const executor = resolveExecutor(this.db, options);

    for (const input of inputs) {
      await executor
        .update(exerciseEntries)
        .set({
          effortFeedback: input.effortFeedback,
          completedAt: input.completedAt,
          updatedAt: new Date()
        })
        .where(eq(exerciseEntries.id, input.exerciseEntryId));
    }
  }

  public async skipPendingWorkoutSets(
    input: SkipPendingWorkoutSetsInput,
    options?: RepositoryOptions
  ): Promise<number> {
    const executor = resolveExecutor(this.db, options);
    const exerciseEntryRows = await executor
      .select({ id: exerciseEntries.id })
      .from(exerciseEntries)
      .where(eq(exerciseEntries.workoutSessionId, input.sessionId));

    if (exerciseEntryRows.length === 0) {
      return 0;
    }

    const updatedSets = await executor
      .update(sets)
      .set({
        status: "skipped",
        completedAt: input.skippedAt,
        updatedAt: new Date()
      })
      .where(
        and(
          inArray(
            sets.exerciseEntryId,
            exerciseEntryRows.map((row: any) => row.id)
          ),
          eq(sets.status, "pending")
        )
      )
      .returning({ id: sets.id });

    return updatedSets.length;
  }

  public async completeSession(
    input: CompleteWorkoutSessionPersistenceInput,
    options?: RepositoryOptions
  ): Promise<WorkoutSessionRecord> {
    const executor = resolveExecutor(this.db, options);
    const [row] = await executor
      .update(workoutSessions)
      .set({
        status: "completed",
        completedAt: input.completedAt,
        durationSeconds: input.durationSeconds,
        isPartial: input.isPartial,
        userEffortFeedback: input.userEffortFeedback,
        recoveryState: input.recoveryState,
        updatedAt: new Date()
      })
      .where(eq(workoutSessions.id, input.sessionId))
      .returning();

    if (!row) {
      throw new Error(`Workout session ${input.sessionId} was not found for completion.`);
    }

    return mapWorkoutSessionRecord(row);
  }

  public async cancelSession(
    input: CancelWorkoutSessionPersistenceInput,
    options?: RepositoryOptions
  ): Promise<WorkoutSessionRecord> {
    const executor = resolveExecutor(this.db, options);
    const [row] = await executor
      .update(workoutSessions)
      .set({
        status: "abandoned",
        completedAt: null,
        durationSeconds: null,
        userEffortFeedback: null,
        recoveryState: null,
        updatedAt: new Date()
      })
      .where(eq(workoutSessions.id, input.sessionId))
      .returning();

    if (!row) {
      throw new Error(`Workout session ${input.sessionId} was not found for cancellation.`);
    }

    return mapWorkoutSessionRecord(row);
  }

  public async listRecentCompletedByUserId(
    userId: string,
    limit: number,
    options?: RepositoryOptions
  ): Promise<WorkoutHistorySummaryRecord[]> {
    const executor = resolveExecutor(this.db, options);
    const rows = await executor
      .select({
        id: workoutSessions.id,
        workoutNameSnapshot: workoutSessions.workoutNameSnapshot,
        programNameSnapshot: workoutSessions.programNameSnapshot,
        status: workoutSessions.status,
        startedAt: workoutSessions.startedAt,
        completedAt: workoutSessions.completedAt,
        durationSeconds: workoutSessions.durationSeconds,
        isPartial: workoutSessions.isPartial
      })
      .from(workoutSessions)
      .where(and(eq(workoutSessions.userId, userId), eq(workoutSessions.status, "completed")))
      .orderBy(desc(workoutSessions.completedAt), desc(workoutSessions.startedAt))
      .limit(limit);

    const result: WorkoutHistorySummaryRecord[] = [];
    for (const row of rows) {
      const exerciseCountRows = await executor
        .select({ count: sql<number>`count(*)` })
        .from(exerciseEntries)
        .where(eq(exerciseEntries.workoutSessionId, row.id));

      const setCountRows = await executor
        .select({
          plannedCount: sql<number>`count(*)`,
          completedCount: sql<number>`count(*) filter (where ${sets.status} = 'completed')`,
          failedCount: sql<number>`count(*) filter (where ${sets.status} = 'failed')`
        })
        .from(sets)
        .innerJoin(exerciseEntries, eq(sets.exerciseEntryId, exerciseEntries.id))
        .where(eq(exerciseEntries.workoutSessionId, row.id));

      result.push({
        id: row.id,
        workoutName: row.workoutNameSnapshot,
        programName: row.programNameSnapshot,
        status: row.status,
        startedAt: row.startedAt,
        completedAt: row.completedAt,
        durationSeconds: row.durationSeconds,
        isPartial: row.isPartial,
        exerciseCount: Number(exerciseCountRows[0]?.count ?? 0),
        plannedSetCount: Number(setCountRows[0]?.plannedCount ?? 0),
        completedSetCount: Number(setCountRows[0]?.completedCount ?? 0),
        failedSetCount: Number(setCountRows[0]?.failedCount ?? 0)
      });
    }

    return result;
  }

  public async countCompletedByUserIdWithinRange(
    userId: string,
    range: { startsAt: Date; endsAt: Date },
    options?: RepositoryOptions
  ): Promise<number> {
    const executor = resolveExecutor(this.db, options);
    const rows = await executor
      .select({ count: sql<number>`count(*)` })
      .from(workoutSessions)
      .where(
        and(
          eq(workoutSessions.userId, userId),
          eq(workoutSessions.status, "completed"),
          gte(workoutSessions.completedAt, range.startsAt),
          lte(workoutSessions.completedAt, range.endsAt)
        )
      );

    return Number(rows[0]?.count ?? 0);
  }

  public async countCompletedByUserId(userId: string, options?: RepositoryOptions): Promise<number> {
    const executor = resolveExecutor(this.db, options);
    const rows = await executor
      .select({ count: sql<number>`count(*)` })
      .from(workoutSessions)
      .where(and(eq(workoutSessions.userId, userId), eq(workoutSessions.status, "completed")));

    return Number(rows[0]?.count ?? 0);
  }

  public async countCompletedByUserIdAndProgramId(
    userId: string,
    programId: string,
    options?: RepositoryOptions
  ): Promise<number> {
    const executor = resolveExecutor(this.db, options);
    const rows = await executor
      .select({ count: sql<number>`count(*)` })
      .from(workoutSessions)
      .where(
        and(
          eq(workoutSessions.userId, userId),
          eq(workoutSessions.programId, programId),
          eq(workoutSessions.status, "completed")
        )
      );

    return Number(rows[0]?.count ?? 0);
  }

  public async listCompletedProgressionByUserId(
    userId: string,
    limit: number,
    options?: RepositoryOptions
  ): Promise<CompletedWorkoutProgressionRecord[]> {
    const executor = resolveExecutor(this.db, options);
    const recentSessions = await executor
      .select({
        id: workoutSessions.id,
        workoutName: workoutSessions.workoutNameSnapshot,
        completedAt: workoutSessions.completedAt
      })
      .from(workoutSessions)
      .where(and(eq(workoutSessions.userId, userId), eq(workoutSessions.status, "completed")))
      .orderBy(desc(workoutSessions.completedAt))
      .limit(limit);

    const sessionIds = recentSessions.map((session: any) => session.id);
    if (sessionIds.length === 0) {
      return [];
    }

    const rows = await executor
      .select({
        workoutSessionId: workoutSessions.id,
        workoutName: workoutSessions.workoutNameSnapshot,
        completedAt: workoutSessions.completedAt,
        exerciseId: exerciseEntries.exerciseId,
        exerciseName: exerciseEntries.exerciseNameSnapshot,
        exerciseCategory: exerciseEntries.exerciseCategorySnapshot,
        setId: sets.id,
        actualReps: sets.actualReps,
        actualWeightLbs: sets.actualWeightLbs,
        setStatus: sets.status
      })
      .from(workoutSessions)
      .innerJoin(exerciseEntries, eq(exerciseEntries.workoutSessionId, workoutSessions.id))
      .innerJoin(sets, eq(sets.exerciseEntryId, exerciseEntries.id))
      .where(inArray(workoutSessions.id, sessionIds))
      .orderBy(desc(workoutSessions.completedAt), asc(exerciseEntries.sequenceOrder), asc(sets.setNumber));

    return rows
      .filter((row: any) => row.completedAt)
      .map((row: any) => ({
        workoutSessionId: row.workoutSessionId,
        workoutName: row.workoutName,
        completedAt: row.completedAt,
        exerciseId: row.exerciseId,
        exerciseName: row.exerciseName,
        exerciseCategory: row.exerciseCategory,
        setId: row.setId,
        actualReps: row.actualReps,
        actualWeightLbs: normalizeNullableNumeric(row.actualWeightLbs),
        setStatus: row.setStatus
      }));
  }

  public async findMostRecentCompletedNonStrengthTotals(
    input: {
      userId: string;
      exerciseId: string;
      excludeWorkoutSessionId?: string;
    },
    options?: RepositoryOptions
  ): Promise<
    | {
        completedAt: Date | null;
        durationSeconds: number | null;
        distanceMeters: number | null;
        rounds: number | null;
      }
    | null
  > {
    const executor = resolveExecutor(this.db, options);
    const excludeWorkoutSessionId = input.excludeWorkoutSessionId ?? null;

    const [latest] = await executor
      .select({
        exerciseEntryId: exerciseEntries.id,
        completedAt: workoutSessions.completedAt
      })
      .from(exerciseEntries)
      .innerJoin(workoutSessions, eq(exerciseEntries.workoutSessionId, workoutSessions.id))
      .where(
        and(
          eq(workoutSessions.userId, input.userId),
          eq(workoutSessions.status, "completed"),
          eq(exerciseEntries.exerciseId, input.exerciseId),
          excludeWorkoutSessionId ? sql`${workoutSessions.id} <> ${excludeWorkoutSessionId}` : sql`true`
        )
      )
      .orderBy(desc(workoutSessions.completedAt))
      .limit(1);

    if (!latest?.exerciseEntryId) {
      return null;
    }

    const [totals] = await executor
      .select({
        durationSeconds: sql<number | null>`sum(${sets.actualDurationSeconds})`,
        distanceMeters: sql<any>`sum(${sets.actualDistanceMeters})`,
        rounds: sql<number | null>`sum(${sets.actualRounds})`
      })
      .from(sets)
      .where(
        and(
          eq(sets.exerciseEntryId, latest.exerciseEntryId),
          inArray(sets.status, ["completed", "failed"])
        )
      );

    return {
      completedAt: latest.completedAt ?? null,
      durationSeconds: totals?.durationSeconds === null || totals?.durationSeconds === undefined ? null : Number(totals.durationSeconds),
      distanceMeters: normalizeNullableNumeric(totals?.distanceMeters),
      rounds: totals?.rounds === null || totals?.rounds === undefined ? null : Number(totals.rounds)
    };
  }
}
