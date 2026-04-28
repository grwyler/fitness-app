import type { StartWorkoutSessionRequest, WorkoutSessionDto } from "@fitness/shared";
import {
  CUSTOM_WORKOUT_TEMPLATE_ID,
  isCustomWorkoutTemplateId
} from "../../domain/models/custom-workout.js";
import { WorkoutSessionFactory } from "../../domain/services/workout-session-factory.js";
import type { EnrollmentRepository } from "../../repositories/interfaces/enrollment.repository.js";
import type { ExerciseRepository } from "../../repositories/interfaces/exercise.repository.js";
import type { IdempotencyRepository } from "../../repositories/interfaces/idempotency.repository.js";
import type { ProgressionStateRepository } from "../../repositories/interfaces/progression-state.repository.js";
import type { WorkoutSessionRepository } from "../../repositories/interfaces/workout-session.repository.js";
import { mapWorkoutSessionDto } from "../mappers/workout-dto.mapper.js";
import { WorkoutApplicationError } from "../errors/workout-application.error.js";
import { IdempotencyService } from "../services/idempotency.service.js";
import type { TransactionManager } from "../services/transaction-manager.js";
import type { RequestContext } from "../types/request-context.js";
import type { UseCaseResult } from "../types/use-case-result.js";

function buildStartWorkoutFingerprint(request: StartWorkoutSessionRequest) {
  return JSON.stringify({
    sessionType: request.sessionType ?? "program",
    workoutTemplateId: request.workoutTemplateId ?? null,
    startedAt: request.startedAt ?? null
  });
}

export class StartWorkoutSessionUseCase {
  private readonly idempotencyService: IdempotencyService;
  private readonly workoutSessionFactory = new WorkoutSessionFactory();

  public constructor(
    private readonly workoutSessionRepository: WorkoutSessionRepository,
    private readonly enrollmentRepository: EnrollmentRepository,
    private readonly progressionStateRepository: ProgressionStateRepository,
    private readonly exerciseRepository: ExerciseRepository,
    private readonly transactionManager: TransactionManager,
    idempotencyRepository: IdempotencyRepository
  ) {
    this.idempotencyService = new IdempotencyService(idempotencyRepository);
  }

  public async execute(input: {
    context: RequestContext;
    request: StartWorkoutSessionRequest;
    idempotencyKey: string;
  }): Promise<UseCaseResult<WorkoutSessionDto>> {
    const idempotentResult = await this.idempotencyService.execute({
      key: input.idempotencyKey,
      userId: input.context.userId,
      routeFamily: "start_workout_session",
      targetResourceId: null,
      requestFingerprint: buildStartWorkoutFingerprint(input.request),
      transactionManager: this.transactionManager,
      execute: async (tx) => {
        const existingSession = await this.workoutSessionRepository.findInProgressByUserId(
          input.context.userId,
          { tx }
        );
        if (existingSession) {
          throw new WorkoutApplicationError(
            "ACTIVE_WORKOUT_ALREADY_EXISTS",
            "The user already has an in-progress workout session."
          );
        }

        const isCustomWorkoutRequest =
          input.request.sessionType === "custom" ||
          (input.request.workoutTemplateId
            ? isCustomWorkoutTemplateId(input.request.workoutTemplateId)
            : false);

        const activeEnrollment = isCustomWorkoutRequest
          ? null
          : await this.enrollmentRepository.findActiveByUserId(input.context.userId, {
              tx
            });
        if (!isCustomWorkoutRequest && !activeEnrollment) {
          throw new WorkoutApplicationError(
            "ACTIVE_ENROLLMENT_NOT_FOUND",
            "The user does not have an active enrollment."
          );
        }

        const targetTemplateId = isCustomWorkoutRequest
          ? CUSTOM_WORKOUT_TEMPLATE_ID
          : input.request.workoutTemplateId ?? activeEnrollment?.currentWorkoutTemplateId;
        if (!targetTemplateId) {
          throw new WorkoutApplicationError(
            "WORKOUT_TEMPLATE_NOT_FOUND",
            "The active enrollment does not have a next workout template."
          );
        }

        const workoutTemplateDefinition = await this.exerciseRepository.findTemplateDefinitionById(
          targetTemplateId,
          { tx }
        );
        if (!workoutTemplateDefinition) {
          throw new WorkoutApplicationError(
            "WORKOUT_TEMPLATE_NOT_FOUND",
            "The requested workout template could not be found."
          );
        }
        if (
          !isCustomWorkoutRequest &&
          workoutTemplateDefinition.template.programId !== activeEnrollment?.programId
        ) {
          throw new WorkoutApplicationError(
            "WORKOUT_TEMPLATE_NOT_FOUND",
            "The requested workout template is not part of the active program."
          );
        }

        const exerciseIds = workoutTemplateDefinition.exercises.map(({ exercise }) => exercise.id);
        const progressionSeeds = await this.exerciseRepository.findProgressionSeedsByExerciseIds(
          exerciseIds,
          { tx }
        );

        if (progressionSeeds.length !== exerciseIds.length) {
          throw new WorkoutApplicationError(
            "PROGRESSION_SEED_NOT_FOUND",
            "One or more exercise progression seeds could not be found."
          );
        }

        const existingProgressionStates = await this.progressionStateRepository.findByUserIdAndExerciseIds(
          input.context.userId,
          exerciseIds,
          { tx }
        );

        const existingProgressionStateByExerciseId = new Set(
          existingProgressionStates.map((progressionState) => progressionState.exerciseId)
        );

        const missingProgressionStateInputs = progressionSeeds
          .filter((progressionSeed) => !existingProgressionStateByExerciseId.has(progressionSeed.exerciseId))
          .map((progressionSeed) => ({
            userId: input.context.userId,
            exerciseId: progressionSeed.exerciseId,
            currentWeightLbs: progressionSeed.defaultStartingWeightLbs,
            lastCompletedWeightLbs: null,
            consecutiveFailures: 0,
            lastEffortFeedback: null,
            lastPerformedAt: null
          }));

        const createdProgressionStates =
          missingProgressionStateInputs.length > 0
            ? await this.progressionStateRepository.createMany(missingProgressionStateInputs, { tx })
            : [];

        const progressionStates = [...existingProgressionStates, ...createdProgressionStates];

        const workoutSessionGraphInput = this.workoutSessionFactory.build({
          userId: input.context.userId,
          programId: workoutTemplateDefinition.template.programId,
          programName: workoutTemplateDefinition.template.programName,
          workoutTemplateDefinition,
          progressionStates,
          startedAt: input.request.startedAt ? new Date(input.request.startedAt) : new Date()
        });

        const createdWorkoutSessionGraph = await this.workoutSessionRepository.createSessionGraph(
          workoutSessionGraphInput,
          { tx }
        );

        return mapWorkoutSessionDto(createdWorkoutSessionGraph);
      }
    });

    return {
      data: idempotentResult.response,
      meta: {
        replayed: idempotentResult.replayed
      }
    };
  }
}
