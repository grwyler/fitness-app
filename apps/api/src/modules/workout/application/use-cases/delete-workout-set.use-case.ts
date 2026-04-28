import type { DeleteWorkoutSetRequest, WorkoutSessionDto } from "@fitness/shared";
import type { IdempotencyRepository } from "../../repositories/interfaces/idempotency.repository.js";
import type { WorkoutSessionRepository } from "../../repositories/interfaces/workout-session.repository.js";
import { mapWorkoutSessionDto } from "../mappers/workout-dto.mapper.js";
import { WorkoutApplicationError } from "../errors/workout-application.error.js";
import { IdempotencyService } from "../services/idempotency.service.js";
import type { TransactionManager } from "../services/transaction-manager.js";
import type { RequestContext } from "../types/request-context.js";
import type { UseCaseResult } from "../types/use-case-result.js";

function buildDeleteWorkoutSetFingerprint(setId: string, _request: DeleteWorkoutSetRequest) {
  return JSON.stringify({
    setId
  });
}

export class DeleteWorkoutSetUseCase {
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
    request: DeleteWorkoutSetRequest;
    idempotencyKey: string;
  }): Promise<UseCaseResult<WorkoutSessionDto>> {
    const idempotentResult = await this.idempotencyService.execute({
      key: input.idempotencyKey,
      userId: input.context.userId,
      routeFamily: "delete_workout_set",
      targetResourceId: input.setId,
      requestFingerprint: buildDeleteWorkoutSetFingerprint(input.setId, input.request),
      transactionManager: this.transactionManager,
      execute: async (tx) => {
        const setForDeletion = await this.workoutSessionRepository.findOwnedSetForLogging(
          input.context.userId,
          input.setId,
          { tx }
        );
        if (!setForDeletion) {
          throw new WorkoutApplicationError("SET_NOT_FOUND", "The requested set could not be found.");
        }
        if (setForDeletion.workoutSession.status !== "in_progress") {
          throw new WorkoutApplicationError(
            "INVALID_SESSION_STATUS",
            "Sets can only be deleted from an in-progress workout session."
          );
        }
        if (setForDeletion.set.status !== "pending") {
          throw new WorkoutApplicationError(
            "BUSINESS_RULE_VIOLATION",
            "Only pending sets can be deleted."
          );
        }

        const workoutSessionGraph = await this.workoutSessionRepository.findOwnedSessionGraphById(
          input.context.userId,
          setForDeletion.workoutSession.id,
          { tx }
        );
        if (!workoutSessionGraph) {
          throw new WorkoutApplicationError(
            "SESSION_NOT_FOUND",
            "The parent workout session could not be reloaded before deleting the set."
          );
        }

        const siblingSets = workoutSessionGraph.sets.filter(
          (set) => set.exerciseEntryId === setForDeletion.exerciseEntry.id
        );
        if (siblingSets.length <= 1) {
          throw new WorkoutApplicationError(
            "BUSINESS_RULE_VIOLATION",
            "An exercise must keep at least one set."
          );
        }

        const maxSetNumber = siblingSets.reduce(
          (maxNumber, set) => Math.max(maxNumber, set.setNumber),
          0
        );
        if (setForDeletion.set.setNumber !== maxSetNumber) {
          throw new WorkoutApplicationError(
            "BUSINESS_RULE_VIOLATION",
            "Only the last pending set can be deleted."
          );
        }

        const updatedGraph = await this.workoutSessionRepository.deleteWorkoutSet(
          {
            setId: setForDeletion.set.id,
            exerciseEntryId: setForDeletion.exerciseEntry.id,
            targetSets: siblingSets.length - 1
          },
          { tx }
        );

        return mapWorkoutSessionDto(updatedGraph);
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
