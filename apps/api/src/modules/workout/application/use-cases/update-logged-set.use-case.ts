import type { LogSetRequest, LogSetResponse } from "@fitness/shared";
import { isMaterialOverperformanceSet } from "../../domain/services/progression-engine.js";
import type { IdempotencyRepository } from "../../repositories/interfaces/idempotency.repository.js";
import type { WorkoutSessionRepository } from "../../repositories/interfaces/workout-session.repository.js";
import { mapLogSetResponse } from "../mappers/workout-dto.mapper.js";
import { WorkoutApplicationError } from "../errors/workout-application.error.js";
import { IdempotencyService } from "../services/idempotency.service.js";
import type { TransactionManager } from "../services/transaction-manager.js";
import type { RequestContext } from "../types/request-context.js";
import type { UseCaseResult } from "../types/use-case-result.js";

function buildUpdateLoggedSetFingerprint(setId: string, request: LogSetRequest) {
  return JSON.stringify({
    setId,
    actualReps: request.actualReps,
    actualWeight: request.actualWeight ?? null,
    completedAt: request.completedAt ?? null
  });
}

export class UpdateLoggedSetUseCase {
  private readonly idempotencyService: IdempotencyService;

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
      routeFamily: "update_logged_set",
      targetResourceId: input.setId,
      requestFingerprint: buildUpdateLoggedSetFingerprint(input.setId, input.request),
      transactionManager: this.transactionManager,
      execute: async (tx) => {
        const setForUpdate = await this.workoutSessionRepository.findOwnedSetForLogging(
          input.context.userId,
          input.setId,
          { tx }
        );
        if (!setForUpdate) {
          throw new WorkoutApplicationError("SET_NOT_FOUND", "The requested set could not be found.");
        }

        if (setForUpdate.workoutSession.status !== "in_progress" && setForUpdate.workoutSession.status !== "completed") {
          throw new WorkoutApplicationError(
            "INVALID_SESSION_STATUS",
            "Sets can only be edited for in-progress or completed workout sessions."
          );
        }

        if (setForUpdate.set.status === "pending") {
          throw new WorkoutApplicationError("SET_NOT_LOGGED", "Only logged sets can be edited.");
        }

        if (setForUpdate.set.status === "skipped") {
          throw new WorkoutApplicationError("SET_NOT_EDITABLE", "Skipped sets cannot be edited yet.");
        }

        const actualWeightLbs =
          input.request.actualWeight?.value ??
          setForUpdate.set.actualWeightLbs ??
          setForUpdate.set.targetWeightLbs;

        const isOverperformanceSet = isMaterialOverperformanceSet({
          targetReps: setForUpdate.set.targetReps,
          actualReps: input.request.actualReps,
          targetWeightLbs: setForUpdate.set.targetWeightLbs,
          actualWeightLbs
        });
        const status =
          input.request.actualReps >= setForUpdate.set.targetReps || isOverperformanceSet
            ? "completed"
            : "failed";

        const completedAt = input.request.completedAt
          ? new Date(input.request.completedAt)
          : setForUpdate.set.completedAt ?? new Date();

        const updatedLoggedSet = await this.workoutSessionRepository.updateLoggedSet(
          {
            setId: input.setId,
            actualReps: input.request.actualReps,
            actualWeightLbs,
            status,
            completedAt
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
            "The parent workout session could not be reloaded after editing the set."
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
