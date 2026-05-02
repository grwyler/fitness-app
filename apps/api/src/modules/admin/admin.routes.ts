import { Router } from "express";
import { z } from "zod";
import { eq, inArray } from "drizzle-orm";
import { feedbackEntries, users } from "@fitness/db";
import { success } from "../../lib/http/envelope.js";
import { AppError } from "../../lib/http/errors.js";
import { requireAdmin } from "../../lib/auth/require-admin.middleware.js";
import { desc } from "../workout/infrastructure/db/drizzle-helpers.js";
import { asyncHandler, validateBody, validateParams } from "../workout/http/workout.http-utils.js";
import {
  exerciseEntries,
  idempotencyRecords,
  progressMetrics,
  progressionStates,
  progressionRecommendationEvents,
  programs,
  sets,
  userProgramEnrollments,
  workoutSessions,
  workoutTemplateExerciseEntries,
  workoutTemplates
} from "@fitness/db";
import { and } from "drizzle-orm";
import { hashPassword } from "../../lib/auth/password.js";

const feedbackEntryPatchSchema = z
  .object({
    description: z.string().trim().min(1).max(5000).optional(),
    category: z.string().min(1).max(64).optional(),
    severity: z.string().min(1).max(32).optional(),
    priority: z.string().min(1).max(8).optional()
  })
  .refine(
    (value) =>
      value.description !== undefined ||
      value.category !== undefined ||
      value.severity !== undefined ||
      value.priority !== undefined,
    {
      message: "At least one field must be provided for update."
    }
  );

const feedbackIdParamsSchema = z.object({
  id: z.string().min(1).max(128)
});

type DatabaseLike = {
  select: (...args: any[]) => any;
  insert: (...args: any[]) => any;
  update: (...args: any[]) => any;
  delete: (...args: any[]) => any;
  transaction: <T>(operation: (tx: any) => Promise<T>) => Promise<T>;
};

const testToolEmailSchema = z.object({
  email: z.string().email().transform((value) => value.trim().toLowerCase())
});

const ALLOWED_TEST_TOOL_EMAILS = new Set(["test@test.com"]);

async function selectIds<TId extends string>(rows: Array<{ id: TId }>): Promise<TId[]> {
  return rows.map((row) => row.id);
}

async function deleteWhereIn<TTable>(tx: any, table: TTable, column: any, values: string[]) {
  if (values.length === 0) {
    return 0;
  }

  const deletedRows = await tx.delete(table).where(inArray(column, values)).returning({ id: column });
  return deletedRows.length;
}

async function resetUserData(database: Pick<DatabaseLike, "transaction">, userId: string) {
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

    const deletedProgressionRecommendationEvents = (
      await tx
        .delete(progressionRecommendationEvents)
        .where(eq(progressionRecommendationEvents.userId, userId))
        .returning({ id: progressionRecommendationEvents.id })
    ).length;
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
    const deletedWorkoutSessions = await deleteWhereIn(tx, workoutSessions, workoutSessions.id, sessionIds);
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
    const deletedCustomTemplates = await deleteWhereIn(tx, workoutTemplates, workoutTemplates.id, customTemplateIds);
    const deletedCustomPrograms = await deleteWhereIn(tx, programs, programs.id, customProgramIds);

    return {
      deletedCustomPrograms,
      deletedCustomTemplateEntries,
      deletedCustomTemplates,
      deletedEnrollments,
      deletedExerciseEntries,
      deletedIdempotencyRecords,
      deletedProgressMetrics,
      deletedProgressionRecommendationEvents,
      deletedProgressionStates,
      deletedSets,
      deletedWorkoutSessions
    };
  });
}

export function createAdminRouter(database: DatabaseLike) {
  const router = Router();

  router.use("/admin", requireAdmin());

  router.get(
    "/admin/feedback",
    asyncHandler(async (_request, response) => {
      const rows = await database
        .select({
          id: feedbackEntries.id,
          createdAt: feedbackEntries.createdAt,
          updatedAt: feedbackEntries.updatedAt,
          description: feedbackEntries.description,
          category: feedbackEntries.category,
          severity: feedbackEntries.severity,
          priority: feedbackEntries.priority,
          context: feedbackEntries.context,
          reporterUserId: feedbackEntries.reporterUserId,
          reporterEmail: users.email
        })
        .from(feedbackEntries)
        .leftJoin(users, eq(users.id, feedbackEntries.reporterUserId))
        .orderBy(desc(feedbackEntries.createdAt))
        .limit(200);

      response.json(
        success(
          rows.map((row: any) => ({
            id: row.id,
            createdAt: row.createdAt.toISOString(),
            updatedAt: row.updatedAt.toISOString(),
            description: row.description,
            category: row.category,
            severity: row.severity,
            priority: row.priority,
            context: row.context as any,
            reporter: {
              userId: row.reporterUserId,
              email: row.reporterEmail ?? null
            }
          }))
        )
      );
    })
  );

  router.put(
    "/admin/feedback/:id",
    asyncHandler(async (request, response) => {
      const { id } = validateParams(feedbackIdParamsSchema, request);
      const patch = validateBody(feedbackEntryPatchSchema, request);

      const [row] = await database
        .update(feedbackEntries)
        .set({
          ...patch,
          updatedAt: new Date()
        })
        .where(eq(feedbackEntries.id, id))
        .returning();

      if (!row) {
        throw new AppError(404, "NOT_FOUND", "Feedback entry not found.");
      }

      response.json(
        success({
          id: row.id,
          createdAt: row.createdAt.toISOString(),
          description: row.description,
          category: row.category,
          severity: row.severity,
          priority: row.priority,
          context: row.context as any
        })
      );
    })
  );

  router.delete(
    "/admin/feedback/:id",
    asyncHandler(async (request, response) => {
      const { id } = validateParams(feedbackIdParamsSchema, request);

      const [row] = await database
        .delete(feedbackEntries)
        .where(eq(feedbackEntries.id, id))
        .returning({
          id: feedbackEntries.id
        });

      if (!row) {
        throw new AppError(404, "NOT_FOUND", "Feedback entry not found.");
      }

      response.json(success({ id: row.id }));
    })
  );

  router.post(
    "/admin/test-tools/seed-test-account",
    asyncHandler(async (request, response) => {
      const body = validateBody(testToolEmailSchema, request);
      if (!ALLOWED_TEST_TOOL_EMAILS.has(body.email)) {
        throw new AppError(403, "FORBIDDEN", "This test tool only supports approved test accounts.");
      }

      const passwordHash = await hashPassword("password");

      const [user] = await database
        .insert(users)
        .values({
          authProviderId: body.email,
          email: body.email,
          displayName: body.email.split("@")[0] ?? null,
          passwordHash,
          role: "user"
        })
        .onConflictDoUpdate({
          target: users.email,
          set: {
            deletedAt: null,
            passwordHash,
            role: "user",
            updatedAt: new Date()
          }
        })
        .returning({
          id: users.id,
          email: users.email,
          role: users.role
        });

      response.json(success({ user }));
    })
  );

  router.post(
    "/admin/test-tools/reset-user-data",
    asyncHandler(async (request, response) => {
      const body = validateBody(testToolEmailSchema, request);
      if (!ALLOWED_TEST_TOOL_EMAILS.has(body.email)) {
        throw new AppError(403, "FORBIDDEN", "This test tool only supports approved test accounts.");
      }

      const [targetUser] = await database
        .select({
          id: users.id,
          email: users.email
        })
        .from(users)
        .where(eq(users.email, body.email))
        .limit(1);

      if (!targetUser) {
        throw new AppError(404, "NOT_FOUND", "Test account not found. Seed the account first.");
      }

      const result = await resetUserData(database, targetUser.id);

      const deleted = {
        customPrograms: result.deletedCustomPrograms,
        customWorkouts: result.deletedCustomPrograms,
        customTemplateEntries: result.deletedCustomTemplateEntries,
        customTemplates: result.deletedCustomTemplates,
        enrollments: result.deletedEnrollments,
        exerciseEntries: result.deletedExerciseEntries,
        idempotencyRecords: result.deletedIdempotencyRecords,
        progressMetrics: result.deletedProgressMetrics,
        programProgress: result.deletedEnrollments,
        progressionRecommendationEvents: result.deletedProgressionRecommendationEvents,
        progression: result.deletedProgressionStates,
        sets: result.deletedSets,
        workoutSessions: result.deletedWorkoutSessions
      };

      response.json(
        success({
          email: targetUser.email,
          success: true,
          deleted,
          reset: result
        })
      );
    })
  );

  return router;
}
