import type { RequestHandler } from "express";
import type {
  CompleteWorkoutSessionRequest,
  LogSetRequest,
  StartWorkoutSessionRequest
} from "@fitness/shared";
import { success } from "../../../lib/http/envelope.js";
import { getRequestContext } from "../../../lib/auth/request-context.middleware.js";
import {
  asyncHandler,
  requireIdempotencyKey,
  validateBody,
  validateParams,
  validateQuery
} from "./workout.http-utils.js";
import {
  completeWorkoutSessionBodySchema,
  logSetBodySchema,
  programParamsSchema,
  setParamsSchema,
  startWorkoutSessionBodySchema,
  workoutHistoryQuerySchema,
  workoutSessionParamsSchema
} from "./workout.schemas.js";
import type { CompleteWorkoutSessionUseCase } from "../application/use-cases/complete-workout-session.use-case.js";
import type { FollowProgramUseCase } from "../application/use-cases/follow-program.use-case.js";
import type { GetCurrentWorkoutSessionUseCase } from "../application/use-cases/get-current-workout-session.use-case.js";
import type { GetDashboardUseCase } from "../application/use-cases/get-dashboard.use-case.js";
import type { GetProgressionUseCase } from "../application/use-cases/get-progression.use-case.js";
import type { GetWorkoutHistoryUseCase } from "../application/use-cases/get-workout-history.use-case.js";
import type { ListProgramsUseCase } from "../application/use-cases/list-programs.use-case.js";
import type { LogSetUseCase } from "../application/use-cases/log-set.use-case.js";
import type { StartWorkoutSessionUseCase } from "../application/use-cases/start-workout-session.use-case.js";

export type WorkoutHttpHandlers = {
  listPrograms: RequestHandler;
  followProgram: RequestHandler;
  getDashboard: RequestHandler;
  getProgression: RequestHandler;
  getWorkoutHistory: RequestHandler;
  getCurrentWorkoutSession: RequestHandler;
  startWorkoutSession: RequestHandler;
  logSet: RequestHandler;
  completeWorkoutSession: RequestHandler;
};

export function createWorkoutHandlers(dependencies: {
  listProgramsUseCase: ListProgramsUseCase;
  followProgramUseCase: FollowProgramUseCase;
  getDashboardUseCase: GetDashboardUseCase;
  getProgressionUseCase: GetProgressionUseCase;
  getWorkoutHistoryUseCase: GetWorkoutHistoryUseCase;
  getCurrentWorkoutSessionUseCase: GetCurrentWorkoutSessionUseCase;
  startWorkoutSessionUseCase: StartWorkoutSessionUseCase;
  logSetUseCase: LogSetUseCase;
  completeWorkoutSessionUseCase: CompleteWorkoutSessionUseCase;
}): WorkoutHttpHandlers {
  return {
    listPrograms: asyncHandler(async (_request, response) => {
      const result = await dependencies.listProgramsUseCase.execute();
      response.json(success(result.data, result.meta));
    }),

    followProgram: asyncHandler(async (request, response) => {
      const context = getRequestContext(request);
      const params = validateParams(programParamsSchema, request);
      const result = await dependencies.followProgramUseCase.execute({
        context,
        programId: params.programId
      });
      response.status(201).json(success(result.data, result.meta));
    }),

    getDashboard: asyncHandler(async (request, response) => {
      const context = getRequestContext(request);
      const result = await dependencies.getDashboardUseCase.execute({ context });
      response.json(success(result.data, result.meta));
    }),

    getProgression: asyncHandler(async (request, response) => {
      const context = getRequestContext(request);
      const result = await dependencies.getProgressionUseCase.execute({ context });
      response.json(success(result.data, result.meta));
    }),

    getWorkoutHistory: asyncHandler(async (request, response) => {
      const context = getRequestContext(request);
      const query = validateQuery(workoutHistoryQuerySchema, request);
      const result = await dependencies.getWorkoutHistoryUseCase.execute({
        context,
        ...(query.limit ? { limit: query.limit } : {})
      });
      response.json(success(result.data, result.meta));
    }),

    getCurrentWorkoutSession: asyncHandler(async (request, response) => {
      const context = getRequestContext(request);
      const result = await dependencies.getCurrentWorkoutSessionUseCase.execute({ context });
      response.json(success(result.data, result.meta));
    }),

    startWorkoutSession: asyncHandler(async (request, response) => {
      const context = getRequestContext(request);
      const body = validateBody(startWorkoutSessionBodySchema, request);
      const idempotencyKey = requireIdempotencyKey(request);
      const useCaseRequest: StartWorkoutSessionRequest = {
        ...(body.workoutTemplateId ? { workoutTemplateId: body.workoutTemplateId } : {}),
        ...(body.startedAt ? { startedAt: body.startedAt } : {})
      };

      const result = await dependencies.startWorkoutSessionUseCase.execute({
        context,
        request: useCaseRequest,
        idempotencyKey
      });

      response.status(201).json(success(result.data, result.meta));
    }),

    logSet: asyncHandler(async (request, response) => {
      const context = getRequestContext(request);
      const params = validateParams(setParamsSchema, request);
      const body = validateBody(logSetBodySchema, request);
      const idempotencyKey = requireIdempotencyKey(request);
      const useCaseRequest: LogSetRequest = {
        actualReps: body.actualReps,
        ...(body.actualWeight ? { actualWeight: body.actualWeight } : {}),
        ...(body.completedAt ? { completedAt: body.completedAt } : {})
      };

      const result = await dependencies.logSetUseCase.execute({
        context,
        setId: params.setId,
        request: useCaseRequest,
        idempotencyKey
      });

      response.json(success(result.data, result.meta));
    }),

    completeWorkoutSession: asyncHandler(async (request, response) => {
      const context = getRequestContext(request);
      const params = validateParams(workoutSessionParamsSchema, request);
      const body = validateBody(completeWorkoutSessionBodySchema, request);
      const idempotencyKey = requireIdempotencyKey(request);
      const useCaseRequest: CompleteWorkoutSessionRequest = {
        exerciseFeedback: body.exerciseFeedback,
        ...(body.completedAt ? { completedAt: body.completedAt } : {}),
        ...(body.userEffortFeedback ? { userEffortFeedback: body.userEffortFeedback } : {})
      };

      const result = await dependencies.completeWorkoutSessionUseCase.execute({
        context,
        sessionId: params.sessionId,
        request: useCaseRequest,
        idempotencyKey
      });

      response.json(success(result.data, result.meta));
    })
  };
}
