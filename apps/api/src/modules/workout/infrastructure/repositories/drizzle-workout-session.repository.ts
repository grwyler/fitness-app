import { exerciseEntries, sets, workoutSessions } from "@fitness/db";
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
  ExerciseEntryRecord,
  PersistExerciseEntryFeedbackInput,
  SkipPendingWorkoutSetsInput,
  SetRecord,
  UpdateLoggedSetInput,
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

function mapWorkoutSessionRecord(row: typeof workoutSessions.$inferSelect): WorkoutSessionRecord {
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
    userEffortFeedback: row.userEffortFeedback,
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
    sequenceOrder: row.sequenceOrder,
    targetSets: row.targetSets,
    targetReps: row.targetReps,
    targetWeightLbs: normalizeNumeric(row.targetWeightLbs),
    restSeconds: row.restSeconds,
    effortFeedback: row.effortFeedback,
    completedAt: row.completedAt,
    exerciseNameSnapshot: row.exerciseNameSnapshot,
    exerciseCategorySnapshot: row.exerciseCategorySnapshot,
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
    targetReps: row.targetReps,
    actualReps: row.actualReps,
    targetWeightLbs: normalizeNumeric(row.targetWeightLbs),
    actualWeightLbs: normalizeNullableNumeric(row.actualWeightLbs),
    status: row.status,
    completedAt: row.completedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

export class DrizzleWorkoutSessionRepository implements WorkoutSessionRepository {
  public constructor(private readonly db: any) {}

  private async loadSessionGraph(
    sessionId: string,
    executor: any
  ): Promise<WorkoutSessionGraph | null> {
    const sessionRow = await executor.query.workoutSessions.findFirst({
      where: eq(workoutSessions.id, sessionId)
    });
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

    return {
      session: mapWorkoutSessionRecord(sessionRow),
      exerciseEntries: exerciseEntryRows.map(mapExerciseEntryRecord),
      sets: setRows.map(mapSetRecord)
    };
  }

  public async findInProgressByUserId(
    userId: string,
    options?: RepositoryOptions
  ): Promise<WorkoutSessionGraph | null> {
    const executor = resolveExecutor(this.db, options);
    const sessionRow = await executor.query.workoutSessions.findFirst({
      where: and(eq(workoutSessions.userId, userId), eq(workoutSessions.status, "in_progress"))
    });

    return sessionRow ? this.loadSessionGraph(sessionRow.id, executor) : null;
  }

  public async findOwnedById(
    userId: string,
    sessionId: string,
    options?: RepositoryOptions
  ): Promise<WorkoutSessionRecord | null> {
    const executor = resolveExecutor(this.db, options);
    const row = await executor.query.workoutSessions.findFirst({
      where: and(eq(workoutSessions.id, sessionId), eq(workoutSessions.userId, userId))
    });

    return row ? mapWorkoutSessionRecord(row) : null;
  }

  public async findOwnedSessionGraphById(
    userId: string,
    sessionId: string,
    options?: RepositoryOptions
  ): Promise<WorkoutSessionGraph | null> {
    const executor = resolveExecutor(this.db, options);
    const sessionRow = await executor.query.workoutSessions.findFirst({
      where: and(eq(workoutSessions.id, sessionId), eq(workoutSessions.userId, userId))
    });

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
          targetWeightLbs: exerciseEntryInput.targetWeightLbs.toString()
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
          targetWeightLbs: setInput.targetWeightLbs.toString(),
          actualWeightLbs: setInput.actualWeightLbs === null ? null : setInput.actualWeightLbs.toString()
        })
        .returning();

      insertedSets.push(setRow);
    }

    return {
      session: mapWorkoutSessionRecord(sessionRow),
      exerciseEntries: insertedExerciseEntries.map(mapExerciseEntryRecord),
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
        targetWeightLbs: input.exerciseEntry.targetWeightLbs.toString()
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
        targetWeightLbs: setInput.targetWeightLbs.toString(),
        actualWeightLbs: setInput.actualWeightLbs === null ? null : setInput.actualWeightLbs.toString()
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
        targetWeightLbs: input.set.targetWeightLbs.toString(),
        actualWeightLbs: input.set.actualWeightLbs === null ? null : input.set.actualWeightLbs.toString()
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

  public async updateLoggedSet(
    input: UpdateLoggedSetInput,
    options?: RepositoryOptions
  ): Promise<WorkoutSetForLoggingRecord> {
    const executor = resolveExecutor(this.db, options);
    const [updatedSet] = await executor
      .update(sets)
      .set({
        actualReps: input.actualReps,
        actualWeightLbs: input.actualWeightLbs.toString(),
        status: input.status,
        completedAt: input.completedAt,
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
      .select()
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
}
