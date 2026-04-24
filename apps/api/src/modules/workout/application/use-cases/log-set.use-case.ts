import type { LogSetRequest, LogSetResponse } from "@fitness/shared";
import { WorkoutValidationService } from "../../domain/services/workout-validation-service.js";
import type { IdempotencyRepository } from "../../repositories/interfaces/idempotency.repository.js";
import type { WorkoutSessionRepository } from "../../repositories/interfaces/workout-session.repository.js";
import { mapLogSetResponse } from "../mappers/workout-dto.mapper.js";
import { WorkoutApplicationError } from "../errors/workout-application.error.js";
import { IdempotencyService } from "../services/idempotency.service.js";
import type { TransactionManager } from "../services/transaction-manager.js";
import type { RequestContext } from "../types/request-context.js";
import type { UseCaseResult } from "../types/use-case-result.js";

function buildLogSetFingerprint(setId: string, request: LogSetRequest) {
  return JSON.stringify({
    setId,
    actualReps: request.actualReps,
    actualWeight: request.actualWeight ?? null,
    completedAt: request.completedAt ?? null
  });
}

export class LogSetUseCase {
  private readonly idempotencyService: IdempotencyService;
  private readonly validationService = new WorkoutValidationService();

  public constructor(
    private readonly workoutSessionRepository: WorkoutSessionRepository,
    private readonly transactionManager: TransactionManager,
    idempotencyRepository: IdempotencyRepository
  ) {
    this.idempotencyService = new IdempotencyService(idempotencyRepository);
  }

  public async execute(input: {
    context: RequestContext;
    setId: string;
    request: LogSetRequest;
    idempotencyKey: string;
  }): Promise<UseCaseResult<LogSetResponse>> {
    const idempotentResult = await this.idempotencyService.execute({
      key: input.idempotencyKey,
      userId: input.context.userId,
      routeFamily: "log_set",
      targetResourceId: input.setId,
      requestFingerprint: buildLogSetFingerprint(input.setId, input.request),
      transactionManager: this.transactionManager,
      execute: async (tx) => {
        const setForLogging = await this.workoutSessionRepository.findOwnedSetForLogging(
          input.context.userId,
          input.setId,
          { tx }
        );
        if (!setForLogging) {
          throw new WorkoutApplicationError("SET_NOT_FOUND", "The requested set could not be found.");
        }

        this.validationService.assertSetCanBeLogged({
          workoutSessionStatus: setForLogging.workoutSession.status,
          setStatus: setForLogging.set.status
        });

        const actualWeightLbs = input.request.actualWeight?.value ?? setForLogging.set.targetWeightLbs;
        const status = input.request.actualReps >= setForLogging.set.targetReps ? "completed" : "failed";

        const updatedLoggedSet = await this.workoutSessionRepository.updateLoggedSet(
          {
            setId: input.setId,
            actualReps: input.request.actualReps,
            actualWeightLbs,
            status,
            completedAt: input.request.completedAt ? new Date(input.request.completedAt) : new Date()
          },
          { tx }
        );

        const workoutSessionGraph = await this.workoutSessionRepository.findOwnedSessionGraphById(
          input.context.userId,
          updatedLoggedSet.workoutSession.id,
          { tx }
        );
        if (!workoutSessionGraph) {
          throw new WorkoutApplicationError(
            "SESSION_NOT_FOUND",
            "The parent workout session could not be reloaded after logging the set."
          );
        }

        return mapLogSetResponse(workoutSessionGraph, input.setId);
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
