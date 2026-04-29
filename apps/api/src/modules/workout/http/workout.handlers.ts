import type { RequestHandler } from "express";
import type {
  AddCustomWorkoutExerciseRequest,
  AddWorkoutSetRequest,
  CompleteWorkoutSessionRequest,
  CreateCustomProgramRequest,
  DeleteWorkoutSetRequest,
  LogSetRequest,
  StartWorkoutSessionRequest,
  UpdateCustomProgramRequest
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
  addCustomWorkoutExerciseBodySchema,
  completeWorkoutSessionBodySchema,
  createCustomProgramBodySchema,
  logSetBodySchema,
  programParamsSchema,
  setParamsSchema,
  startWorkoutSessionBodySchema,
  workoutSessionExerciseParamsSchema,
  workoutHistoryQuerySchema,
  workoutSessionParamsSchema
} from "./workout.schemas.js";
import type { AddCustomWorkoutExerciseUseCase } from "../application/use-cases/add-custom-workout-exercise.use-case.js";
import type { AddWorkoutSetUseCase } from "../application/use-cases/add-workout-set.use-case.js";
import type { CompleteWorkoutSessionUseCase } from "../application/use-cases/complete-workout-session.use-case.js";
import type { CancelWorkoutSessionUseCase } from "../application/use-cases/cancel-workout-session.use-case.js";
import type { DeleteWorkoutSetUseCase } from "../application/use-cases/delete-workout-set.use-case.js";
import type { FollowProgramUseCase } from "../application/use-cases/follow-program.use-case.js";
import type { CreateCustomProgramUseCase } from "../application/use-cases/create-custom-program.use-case.js";
import type { GetCurrentWorkoutSessionUseCase } from "../application/use-cases/get-current-workout-session.use-case.js";
import type { GetDashboardUseCase } from "../application/use-cases/get-dashboard.use-case.js";
import type { GetProgramUseCase } from "../application/use-cases/get-program.use-case.js";
import type { GetProgressionUseCase } from "../application/use-cases/get-progression.use-case.js";
import type { GetWorkoutHistoryDetailUseCase } from "../application/use-cases/get-workout-history-detail.use-case.js";
import type { GetWorkoutHistoryUseCase } from "../application/use-cases/get-workout-history.use-case.js";
import type { ListExercisesUseCase } from "../application/use-cases/list-exercises.use-case.js";
import type { ListProgramsUseCase } from "../application/use-cases/list-programs.use-case.js";
import type { LogSetUseCase } from "../application/use-cases/log-set.use-case.js";
import type { StartWorkoutSessionUseCase } from "../application/use-cases/start-workout-session.use-case.js";
import type { UpdateLoggedSetUseCase } from "../application/use-cases/update-logged-set.use-case.js";
import type { UpdateCustomProgramUseCase } from "../application/use-cases/update-custom-program.use-case.js";

export type WorkoutHttpHandlers = {
  listPrograms: RequestHandler;
  getProgram: RequestHandler;
  createCustomProgram: RequestHandler;
  updateCustomProgram: RequestHandler;
  listExercises: RequestHandler;
  followProgram: RequestHandler;
  getDashboard: RequestHandler;
  getProgression: RequestHandler;
  getWorkoutHistory: RequestHandler;
  getWorkoutHistoryDetail: RequestHandler;
  getCurrentWorkoutSession: RequestHandler;
  startWorkoutSession: RequestHandler;
  addCustomWorkoutExercise: RequestHandler;
  addWorkoutSet: RequestHandler;
  deleteWorkoutSet: RequestHandler;
  logSet: RequestHandler;
  updateLoggedSet: RequestHandler;
  cancelWorkoutSession: RequestHandler;
  completeWorkoutSession: RequestHandler;
};

export function createWorkoutHandlers(dependencies: {
  listProgramsUseCase: ListProgramsUseCase;
  getProgramUseCase: GetProgramUseCase;
  createCustomProgramUseCase: CreateCustomProgramUseCase;
  updateCustomProgramUseCase: UpdateCustomProgramUseCase;
  listExercisesUseCase: ListExercisesUseCase;
  followProgramUseCase: FollowProgramUseCase;
  getDashboardUseCase: GetDashboardUseCase;
  getProgressionUseCase: GetProgressionUseCase;
  getWorkoutHistoryUseCase: GetWorkoutHistoryUseCase;
  getWorkoutHistoryDetailUseCase: GetWorkoutHistoryDetailUseCase;
  getCurrentWorkoutSessionUseCase: GetCurrentWorkoutSessionUseCase;
  startWorkoutSessionUseCase: StartWorkoutSessionUseCase;
  addCustomWorkoutExerciseUseCase: AddCustomWorkoutExerciseUseCase;
  addWorkoutSetUseCase: AddWorkoutSetUseCase;
  deleteWorkoutSetUseCase: DeleteWorkoutSetUseCase;
  logSetUseCase: LogSetUseCase;
  updateLoggedSetUseCase: UpdateLoggedSetUseCase;
  cancelWorkoutSessionUseCase: CancelWorkoutSessionUseCase;
  completeWorkoutSessionUseCase: CompleteWorkoutSessionUseCase;
}): WorkoutHttpHandlers {
  return {
    listPrograms: asyncHandler(async (_request, response) => {
      const context = getRequestContext(_request);
      const result = await dependencies.listProgramsUseCase.execute({ context });
      response.json(success(result.data, result.meta));
    }),

    getProgram: asyncHandler(async (request, response) => {
      const context = getRequestContext(request);
      const params = validateParams(programParamsSchema, request);
      const result = await dependencies.getProgramUseCase.execute({
        context,
        programId: params.programId
      });
      response.json(success(result.data, result.meta));
    }),

    createCustomProgram: asyncHandler(async (request, response) => {
      const context = getRequestContext(request);
      const body = validateBody(createCustomProgramBodySchema, request);
      const idempotencyKey = requireIdempotencyKey(request);
      const useCaseRequest: CreateCustomProgramRequest = {
        name: body.name,
        workouts: body.workouts.map((workout) => ({
          name: workout.name,
          exercises: workout.exercises.map((exercise) => ({
            exerciseId: exercise.exerciseId,
            targetSets: exercise.targetSets,
            targetReps: exercise.targetReps,
            ...(exercise.restSeconds !== undefined ? { restSeconds: exercise.restSeconds } : {})
          }))
        }))
      };

      const result = await dependencies.createCustomProgramUseCase.execute({
        context,
        request: useCaseRequest,
        idempotencyKey
      });
      response.status(201).json(success(result.data, result.meta));
    }),

    updateCustomProgram: asyncHandler(async (request, response) => {
      const context = getRequestContext(request);
      const params = validateParams(programParamsSchema, request);
      const body = validateBody(createCustomProgramBodySchema, request);
      const useCaseRequest: UpdateCustomProgramRequest = {
        name: body.name,
        workouts: body.workouts.map((workout) => ({
          name: workout.name,
          exercises: workout.exercises.map((exercise) => ({
            exerciseId: exercise.exerciseId,
            targetSets: exercise.targetSets,
            targetReps: exercise.targetReps,
            ...(exercise.restSeconds !== undefined ? { restSeconds: exercise.restSeconds } : {})
          }))
        }))
      };

      const result = await dependencies.updateCustomProgramUseCase.execute({
        context,
        programId: params.programId,
        request: useCaseRequest
      });
      response.json(success(result.data, result.meta));
    }),

    listExercises: asyncHandler(async (_request, response) => {
      const result = await dependencies.listExercisesUseCase.execute();
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

    getWorkoutHistoryDetail: asyncHandler(async (request, response) => {
      const context = getRequestContext(request);
      const params = validateParams(workoutSessionParamsSchema, request);
      const result = await dependencies.getWorkoutHistoryDetailUseCase.execute({
        context,
        sessionId: params.sessionId
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
        ...(body.sessionType ? { sessionType: body.sessionType } : {}),
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

    addCustomWorkoutExercise: asyncHandler(async (request, response) => {
      const context = getRequestContext(request);
      const params = validateParams(workoutSessionParamsSchema, request);
      const body = validateBody(addCustomWorkoutExerciseBodySchema, request);
      const idempotencyKey = requireIdempotencyKey(request);
      const useCaseRequest: AddCustomWorkoutExerciseRequest = {
        exerciseId: body.exerciseId,
        targetSets: body.targetSets,
        targetReps: body.targetReps,
        ...(body.targetWeight !== undefined ? { targetWeight: body.targetWeight } : {}),
        ...(body.restSeconds !== undefined ? { restSeconds: body.restSeconds } : {})
      };

      const result = await dependencies.addCustomWorkoutExerciseUseCase.execute({
        context,
        sessionId: params.sessionId,
        request: useCaseRequest,
        idempotencyKey
      });

      response.status(201).json(success(result.data, result.meta));
    }),

    addWorkoutSet: asyncHandler(async (request, response) => {
      const context = getRequestContext(request);
      const params = validateParams(workoutSessionExerciseParamsSchema, request);
      const idempotencyKey = requireIdempotencyKey(request);
      const useCaseRequest: AddWorkoutSetRequest = {};

      const result = await dependencies.addWorkoutSetUseCase.execute({
        context,
        sessionId: params.sessionId,
        exerciseEntryId: params.exerciseEntryId,
        request: useCaseRequest,
        idempotencyKey
      });

      response.status(201).json(success(result.data, result.meta));
    }),

    deleteWorkoutSet: asyncHandler(async (request, response) => {
      const context = getRequestContext(request);
      const params = validateParams(setParamsSchema, request);
      const idempotencyKey = requireIdempotencyKey(request);
      const useCaseRequest: DeleteWorkoutSetRequest = {};

      const result = await dependencies.deleteWorkoutSetUseCase.execute({
        context,
        setId: params.setId,
        request: useCaseRequest,
        idempotencyKey
      });

      response.json(success(result.data, result.meta));
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

    updateLoggedSet: asyncHandler(async (request, response) => {
      const context = getRequestContext(request);
      const params = validateParams(setParamsSchema, request);
      const body = validateBody(logSetBodySchema, request);
      const idempotencyKey = requireIdempotencyKey(request);
      const useCaseRequest: LogSetRequest = {
        actualReps: body.actualReps,
        ...(body.actualWeight ? { actualWeight: body.actualWeight } : {}),
        ...(body.completedAt ? { completedAt: body.completedAt } : {})
      };

      const result = await dependencies.updateLoggedSetUseCase.execute({
        context,
        setId: params.setId,
        request: useCaseRequest,
        idempotencyKey
      });

      response.json(success(result.data, result.meta));
    }),

    cancelWorkoutSession: asyncHandler(async (request, response) => {
      const context = getRequestContext(request);
      const params = validateParams(workoutSessionParamsSchema, request);
      const idempotencyKey = requireIdempotencyKey(request);

      const result = await dependencies.cancelWorkoutSessionUseCase.execute({
        context,
        sessionId: params.sessionId,
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
        ...(body.userEffortFeedback ? { userEffortFeedback: body.userEffortFeedback } : {}),
        ...(body.finishEarly !== undefined ? { finishEarly: body.finishEarly } : {})
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
