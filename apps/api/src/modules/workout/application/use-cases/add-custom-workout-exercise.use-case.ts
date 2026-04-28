import type { AddCustomWorkoutExerciseRequest, WorkoutSessionDto } from "@fitness/shared";
import { isCustomWorkoutProgramId } from "../../domain/models/custom-workout.js";
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

function buildAddCustomExerciseFingerprint(
  sessionId: string,
  request: AddCustomWorkoutExerciseRequest
) {
  return JSON.stringify({
    sessionId,
    exerciseId: request.exerciseId,
    targetSets: request.targetSets,
    targetReps: request.targetReps,
    restSeconds: request.restSeconds ?? null
  });
}

export class AddCustomWorkoutExerciseUseCase {
  private readonly idempotencyService: IdempotencyService;

  public constructor(
    private readonly workoutSessionRepository: WorkoutSessionRepository,
    private readonly progressionStateRepository: ProgressionStateRepository,
    private readonly exerciseRepository: ExerciseRepository,
    private readonly transactionManager: TransactionManager,
    idempotencyRepository: IdempotencyRepository
  ) {
    this.idempotencyService = new IdempotencyService(idempotencyRepository);
  }

  public async execute(input: {
    context: RequestContext;
    sessionId: string;
    request: AddCustomWorkoutExerciseRequest;
    idempotencyKey: string;
  }): Promise<UseCaseResult<WorkoutSessionDto>> {
    const idempotentResult = await this.idempotencyService.execute({
      key: input.idempotencyKey,
      userId: input.context.userId,
      routeFamily: "add_custom_workout_exercise",
      targetResourceId: input.sessionId,
      requestFingerprint: buildAddCustomExerciseFingerprint(input.sessionId, input.request),
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
            "Exercises can only be added to an in-progress workout session."
          );
        }
        if (!isCustomWorkoutProgramId(workoutSessionGraph.session.programId)) {
          throw new WorkoutApplicationError(
            "BUSINESS_RULE_VIOLATION",
            "Exercises can only be added to custom workouts."
          );
        }

        const exercise = (await this.exerciseRepository.findByIds([input.request.exerciseId], { tx }))[0];
        if (!exercise || !exercise.isActive) {
          throw new WorkoutApplicationError("EXERCISE_NOT_FOUND", "The selected exercise could not be found.");
        }

        const progressionSeed = (
          await this.exerciseRepository.findProgressionSeedsByExerciseIds([exercise.id], { tx })
        )[0];
        if (!progressionSeed) {
          throw new WorkoutApplicationError(
            "PROGRESSION_SEED_NOT_FOUND",
            "Progression defaults could not be loaded for the selected exercise."
          );
        }

        let progressionState = (
          await this.progressionStateRepository.findByUserIdAndExerciseIds(
            input.context.userId,
            [exercise.id],
            { tx }
          )
        )[0];

        if (!progressionState) {
          progressionState = (
            await this.progressionStateRepository.createMany(
              [
                {
                  userId: input.context.userId,
                  exerciseId: exercise.id,
                  currentWeightLbs: progressionSeed.defaultStartingWeightLbs,
                  lastCompletedWeightLbs: null,
                  consecutiveFailures: 0,
                  lastEffortFeedback: null,
                  lastPerformedAt: null
                }
              ],
              { tx }
            )
          )[0];
        }

        if (!progressionState) {
          throw new WorkoutApplicationError(
            "PROGRESSION_STATE_NOT_FOUND",
            "A progression state could not be created for the selected exercise."
          );
        }

        const nextSequenceOrder =
          workoutSessionGraph.exerciseEntries.reduce(
            (maxSequenceOrder, exerciseEntry) => Math.max(maxSequenceOrder, exerciseEntry.sequenceOrder),
            0
          ) + 1;

        const updatedGraph = await this.workoutSessionRepository.appendCustomExercise(
          {
            sessionId: workoutSessionGraph.session.id,
            exerciseEntry: {
              exerciseId: exercise.id,
              sequenceOrder: nextSequenceOrder,
              targetSets: input.request.targetSets,
              targetReps: input.request.targetReps,
              targetWeightLbs: progressionState.currentWeightLbs,
              restSeconds: input.request.restSeconds ?? null,
              effortFeedback: null,
              completedAt: null,
              exerciseNameSnapshot: exercise.name,
              exerciseCategorySnapshot: exercise.category,
              progressionRuleSnapshot: {
                incrementLbs: exercise.defaultIncrementLbs
              }
            },
            sets: Array.from({ length: input.request.targetSets }, (_, index) => ({
              setNumber: index + 1,
              targetReps: input.request.targetReps,
              actualReps: null,
              targetWeightLbs: progressionState.currentWeightLbs,
              actualWeightLbs: null,
              status: "pending",
              completedAt: null
            }))
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
