import { Router } from "express";
import { z } from "zod";
import { feedbackEntries } from "@fitness/db";
import { and, eq } from "drizzle-orm";
import { success } from "../../lib/http/envelope.js";
import { AppError } from "../../lib/http/errors.js";
import { getRequestContext } from "../../lib/auth/request-context.middleware.js";
import { desc } from "../workout/infrastructure/db/drizzle-helpers.js";
import { asyncHandler, requireIdempotencyKey, validateBody, validateParams } from "../workout/http/workout.http-utils.js";

const feedbackContextSchema = z.object({
  screenName: z.string().min(1),
  routeName: z.string().min(1),
  timestamp: z.string().datetime(),
  platform: z.string().min(1),
  workoutSessionId: z.string().nullable(),
  appVersion: z.string().nullable(),
  lastAction: z.string().optional()
});

const feedbackEntrySchema = z.object({
  id: z.string().min(1).max(128),
  createdAt: z.string().datetime(),
  description: z.string().trim().min(1).max(5000),
  category: z.string().min(1).max(64),
  severity: z.string().min(1).max(32),
  priority: z.string().min(1).max(8),
  context: feedbackContextSchema
});

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
};

function mapFeedbackEntry(row: typeof feedbackEntries.$inferSelect) {
  return {
    id: row.id,
    createdAt: row.createdAt.toISOString(),
    description: row.description,
    category: row.category,
    severity: row.severity,
    priority: row.priority,
    context: row.context as any
  };
}

export function createFeedbackRouter(database: DatabaseLike) {
  const router = Router();

  router.get(
    "/feedback",
    asyncHandler(async (request, response) => {
      const { userId } = getRequestContext(request);
      const rows = await database
        .select()
        .from(feedbackEntries)
        .where(eq(feedbackEntries.reporterUserId, userId))
        .orderBy(desc(feedbackEntries.createdAt))
        .limit(200);

      response.json(success(rows.map(mapFeedbackEntry)));
    })
  );

  router.post(
    "/feedback",
    asyncHandler(async (request, response) => {
      requireIdempotencyKey(request);
      const entry = validateBody(feedbackEntrySchema, request);
      const { userId } = getRequestContext(request);

      await database
        .insert(feedbackEntries)
        .values({
          id: entry.id,
          reporterUserId: userId,
          createdAt: new Date(entry.createdAt),
          description: entry.description,
          category: entry.category,
          severity: entry.severity,
          priority: entry.priority,
          context: entry.context
        })
        .onConflictDoNothing({
          target: feedbackEntries.id
        });

      const rows = await database
        .select()
        .from(feedbackEntries)
        .where(eq(feedbackEntries.id, entry.id))
        .limit(1);

      const row = rows[0];
      if (!row) {
        throw new AppError(500, "INTERNAL_ERROR", "Unable to persist feedback entry.");
      }

      response.json(success(mapFeedbackEntry(row)));
    })
  );

  router.put(
    "/feedback/:id",
    asyncHandler(async (request, response) => {
      const { id } = validateParams(feedbackIdParamsSchema, request);
      const patch = validateBody(feedbackEntryPatchSchema, request);
      const { userId } = getRequestContext(request);

      const [row] = await database
        .update(feedbackEntries)
        .set({
          ...patch,
          updatedAt: new Date()
        })
        .where(and(eq(feedbackEntries.id, id), eq(feedbackEntries.reporterUserId, userId)))
        .returning();

      if (!row) {
        throw new AppError(404, "NOT_FOUND", "Feedback entry not found.");
      }

      response.json(success(mapFeedbackEntry(row)));
    })
  );

  router.delete(
    "/feedback/:id",
    asyncHandler(async (request, response) => {
      const { id } = validateParams(feedbackIdParamsSchema, request);
      const { userId } = getRequestContext(request);

      const [row] = await database
        .delete(feedbackEntries)
        .where(and(eq(feedbackEntries.id, id), eq(feedbackEntries.reporterUserId, userId)))
        .returning({
          id: feedbackEntries.id
        });

      if (!row) {
        throw new AppError(404, "NOT_FOUND", "Feedback entry not found.");
      }

      response.json(success({ id: row.id }));
    })
  );

  return router;
}
