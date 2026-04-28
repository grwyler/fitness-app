import {
  exerciseEntries,
  idempotencyRecords,
  progressMetrics,
  progressionStates,
  programs,
  sets,
  userProgramEnrollments,
  workoutSessions,
  workoutTemplateExerciseEntries,
  workoutTemplates
} from "@fitness/db";
import { and, eq, inArray } from "drizzle-orm";
import { Router } from "express";
import { getRequestContext } from "../../lib/auth/request-context.middleware.js";
import { success } from "../../lib/http/envelope.js";
import { AppError } from "../../lib/http/errors.js";

const TEST_USER_EMAIL = "test@test.com";

type DatabaseLike = {
  transaction: <T>(operation: (tx: any) => Promise<T>) => Promise<T>;
};

async function selectIds<TId extends string>(
  rows: Array<{ id: TId }>
): Promise<TId[]> {
  return rows.map((row) => row.id);
}

async function deleteWhereIn<TTable>(
  tx: any,
  table: TTable,
  column: any,
  values: string[]
) {
  if (values.length === 0) {
    return 0;
  }

  const deletedRows = await tx.delete(table).where(inArray(column, values)).returning({ id: column });
  return deletedRows.length;
}

async function resetTestUserData(database: DatabaseLike, userId: string) {
  return database.transaction(async (tx) => {
    const sessionIds = await selectIds(
      await tx
        .select({ id: workoutSessions.id })
        .from(workoutSessions)
        .where(eq(workoutSessions.userId, userId))
    );
    const exerciseEntryIds = await selectIds(
      sessionIds.length === 0
        ? []
        : await tx
            .select({ id: exerciseEntries.id })
            .from(exerciseEntries)
            .where(inArray(exerciseEntries.workoutSessionId, sessionIds))
    );
    const customProgramIds = await selectIds(
      await tx
        .select({ id: programs.id })
        .from(programs)
        .where(and(eq(programs.userId, userId), eq(programs.source, "custom")))
    );
    const customTemplateIds = await selectIds(
      customProgramIds.length === 0
        ? []
        : await tx
            .select({ id: workoutTemplates.id })
            .from(workoutTemplates)
            .where(inArray(workoutTemplates.programId, customProgramIds))
    );

    const deletedSets = await deleteWhereIn(tx, sets, sets.exerciseEntryId, exerciseEntryIds);
    const deletedExerciseEntries = await deleteWhereIn(
      tx,
      exerciseEntries,
      exerciseEntries.workoutSessionId,
      sessionIds
    );
    const deletedProgressMetrics = (
      await tx
        .delete(progressMetrics)
        .where(eq(progressMetrics.userId, userId))
        .returning({ id: progressMetrics.id })
    ).length;
    const deletedProgressionStates = (
      await tx
        .delete(progressionStates)
        .where(eq(progressionStates.userId, userId))
        .returning({ id: progressionStates.id })
    ).length;
    const deletedWorkoutSessions = await deleteWhereIn(
      tx,
      workoutSessions,
      workoutSessions.id,
      sessionIds
    );
    const deletedEnrollments = (
      await tx
        .delete(userProgramEnrollments)
        .where(eq(userProgramEnrollments.userId, userId))
        .returning({ id: userProgramEnrollments.id })
    ).length;
    const deletedIdempotencyRecords = (
      await tx
        .delete(idempotencyRecords)
        .where(eq(idempotencyRecords.userId, userId))
        .returning({ id: idempotencyRecords.id })
    ).length;
    const deletedCustomTemplateEntries = await deleteWhereIn(
      tx,
      workoutTemplateExerciseEntries,
      workoutTemplateExerciseEntries.workoutTemplateId,
      customTemplateIds
    );
    const deletedCustomTemplates = await deleteWhereIn(
      tx,
      workoutTemplates,
      workoutTemplates.id,
      customTemplateIds
    );
    const deletedCustomPrograms = await deleteWhereIn(tx, programs, programs.id, customProgramIds);

    return {
      deletedCustomPrograms,
      deletedCustomTemplateEntries,
      deletedCustomTemplates,
      deletedEnrollments,
      deletedExerciseEntries,
      deletedIdempotencyRecords,
      deletedProgressMetrics,
      deletedProgressionStates,
      deletedSets,
      deletedWorkoutSessions
    };
  });
}

export function createDevResetRouter(database: DatabaseLike) {
  const router = Router();

  router.post("/dev/reset-test-user-data", async (request, response, next) => {
    try {
      if (request.authUser?.email.toLowerCase() !== TEST_USER_EMAIL) {
        throw new AppError(403, "FORBIDDEN", "Resetting test data is only available for the test account.");
      }

      const context = getRequestContext(request);
      const result = await resetTestUserData(database, context.userId);

      response.json(
        success({
          email: TEST_USER_EMAIL,
          reset: result
        })
      );
    } catch (error) {
      next(error);
    }
  });

  return router;
}
