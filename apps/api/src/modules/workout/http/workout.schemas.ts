import { z } from "zod";
import { effortFeedbackValues, unitSystems } from "@fitness/shared";

const weightValueSchema = z.object({
  value: z.number().finite().min(0),
  unit: z.literal("lb")
});

const isoDateTimeSchema = z.string().datetime({ offset: true });

export const workoutHeadersSchema = z.object({
  authorization: z.string().min(1).optional(),
  "idempotency-key": z.string().min(1).optional()
});

export const workoutSessionParamsSchema = z.object({
  sessionId: z.string().min(1)
});

export const programParamsSchema = z.object({
  programId: z.string().min(1)
});

export const workoutHistoryQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional(),
  status: z.literal("completed").optional()
});

export const setParamsSchema = z.object({
  setId: z.string().min(1)
});

export const startWorkoutSessionBodySchema = z.object({
  sessionType: z.enum(["program", "custom"]).optional(),
  workoutTemplateId: z.string().min(1).optional(),
  startedAt: isoDateTimeSchema.optional()
});

export const logSetBodySchema = z.object({
  actualReps: z.number().int().min(0),
  actualWeight: weightValueSchema.optional(),
  completedAt: isoDateTimeSchema.optional()
});

export const completeWorkoutSessionBodySchema = z.object({
  completedAt: isoDateTimeSchema.optional(),
  exerciseFeedback: z
    .array(
      z.object({
        exerciseEntryId: z.string().min(1),
        effortFeedback: z.enum(effortFeedbackValues)
      })
    )
    .default([]),
  userEffortFeedback: z.enum(effortFeedbackValues).optional(),
  finishEarly: z.boolean().optional()
});

export type WorkoutHeaders = z.infer<typeof workoutHeadersSchema>;
export type WorkoutSessionParams = z.infer<typeof workoutSessionParamsSchema>;
export type ProgramParams = z.infer<typeof programParamsSchema>;
export type WorkoutHistoryQuery = z.infer<typeof workoutHistoryQuerySchema>;
export type SetParams = z.infer<typeof setParamsSchema>;
export type StartWorkoutSessionBody = z.infer<typeof startWorkoutSessionBodySchema>;
export type LogSetBody = z.infer<typeof logSetBodySchema>;
export type CompleteWorkoutSessionBody = z.infer<typeof completeWorkoutSessionBodySchema>;
