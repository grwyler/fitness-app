import type { CancelWorkoutSessionResponse } from "@fitness/shared";
import type { IdempotencyRepository } from "../../repositories/interfaces/idempotency.repository.js";
import type { WorkoutSessionRepository } from "../../repositories/interfaces/workout-session.repository.js";
import { mapWorkoutSessionDto } from "../mappers/workout-dto.mapper.js";
import { WorkoutApplicationError } from "../errors/workout-application.error.js";
import { IdempotencyService } from "../services/idempotency.service.js";
import type { TransactionManager } from "../services/transaction-manager.js";
import type { RequestContext } from "../types/request-context.js";
import type { UseCaseResult } from "../types/use-case-result.js";

function buildCancelWorkoutFingerprint(sessionId: string) {
  return JSON.stringify({
    sessionId
  });
}

export class CancelWorkoutSessionUseCase {
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
    sessionId: string;
    idempotencyKey: string;
  }): Promise<UseCaseResult<CancelWorkoutSessionResponse>> {
    const idempotentResult = await this.idempotencyService.execute({
      key: input.idempotencyKey,
      userId: input.context.userId,
      routeFamily: "cancel_workout_session",
      targetResourceId: input.sessionId,
      requestFingerprint: buildCancelWorkoutFingerprint(input.sessionId),
      transactionManager: this.transactionManager,
      execute: async (tx) => {
        const workoutSessionGraph = await this.workoutSessionRepository.findOwnedSessionGraphById(
          input.context.userId,
          input.sessionId,
          { tx }
        );
        if (!workoutSessionGraph) {
          throw new WorkoutApplicationError("SESSION_NOT_FOUND", "The workout session could not be found.");
        }

        if (workoutSessionGraph.session.status === "abandoned") {
          return {
            workoutSession: mapWorkoutSessionDto(workoutSessionGraph)
          };
        }

        if (workoutSessionGraph.session.status !== "in_progress") {
          throw new WorkoutApplicationError(
            "INVALID_SESSION_STATUS",
            "Only in-progress workout sessions can be discarded."
          );
        }

        await this.workoutSessionRepository.cancelSession(
          {
            sessionId: workoutSessionGraph.session.id
          },
          { tx }
        );

        const canceledWorkoutSessionGraph = await this.workoutSessionRepository.findOwnedSessionGraphById(
          input.context.userId,
          workoutSessionGraph.session.id,
          { tx }
        );
        if (!canceledWorkoutSessionGraph) {
          throw new WorkoutApplicationError(
            "SESSION_NOT_FOUND",
            "The discarded workout session could not be reloaded."
          );
        }

        return {
          workoutSession: mapWorkoutSessionDto(canceledWorkoutSessionGraph)
        };
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
