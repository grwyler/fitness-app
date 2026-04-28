import type { AddWorkoutSetRequest, WorkoutSessionDto } from "@fitness/shared";
import type { IdempotencyRepository } from "../../repositories/interfaces/idempotency.repository.js";
import type { WorkoutSessionRepository } from "../../repositories/interfaces/workout-session.repository.js";
import { mapWorkoutSessionDto } from "../mappers/workout-dto.mapper.js";
import { WorkoutApplicationError } from "../errors/workout-application.error.js";
import { IdempotencyService } from "../services/idempotency.service.js";
import type { TransactionManager } from "../services/transaction-manager.js";
import type { RequestContext } from "../types/request-context.js";
import type { UseCaseResult } from "../types/use-case-result.js";

const MAX_SETS_PER_EXERCISE = 20;

function buildAddWorkoutSetFingerprint(
  sessionId: string,
  exerciseEntryId: string,
  _request: AddWorkoutSetRequest
) {
  return JSON.stringify({
    sessionId,
    exerciseEntryId
  });
}

export class AddWorkoutSetUseCase {
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
    exerciseEntryId: string;
    request: AddWorkoutSetRequest;
    idempotencyKey: string;
  }): Promise<UseCaseResult<WorkoutSessionDto>> {
    const idempotentResult = await this.idempotencyService.execute({
      key: input.idempotencyKey,
      userId: input.context.userId,
      routeFamily: "add_workout_set",
      targetResourceId: input.exerciseEntryId,
      requestFingerprint: buildAddWorkoutSetFingerprint(
        input.sessionId,
        input.exerciseEntryId,
        input.request
      ),
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
        if (workoutSessionGraph.session.status !== "in_progress") {
          throw new WorkoutApplicationError(
            "INVALID_SESSION_STATUS",
            "Sets can only be added to an in-progress workout session."
          );
        }

        const exerciseEntry = workoutSessionGraph.exerciseEntries.find(
          (entry) => entry.id === input.exerciseEntryId
        );
        if (!exerciseEntry) {
          throw new WorkoutApplicationError(
            "EXERCISE_ENTRY_NOT_FOUND",
            "The exercise entry could not be found in this workout session."
          );
        }

        const existingSets = workoutSessionGraph.sets.filter(
          (set) => set.exerciseEntryId === exerciseEntry.id
        );
        if (existingSets.length >= MAX_SETS_PER_EXERCISE) {
          throw new WorkoutApplicationError(
            "BUSINESS_RULE_VIOLATION",
            `An exercise can have at most ${MAX_SETS_PER_EXERCISE} sets.`
          );
        }

        const nextSetNumber =
          existingSets.reduce((maxSetNumber, set) => Math.max(maxSetNumber, set.setNumber), 0) + 1;
        const updatedGraph = await this.workoutSessionRepository.appendWorkoutSet(
          {
            exerciseEntryId: exerciseEntry.id,
            targetSets: existingSets.length + 1,
            set: {
              setNumber: nextSetNumber,
              targetReps: exerciseEntry.targetReps,
              actualReps: null,
              targetWeightLbs: exerciseEntry.targetWeightLbs,
              actualWeightLbs: null,
              status: "pending",
              completedAt: null
            }
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
