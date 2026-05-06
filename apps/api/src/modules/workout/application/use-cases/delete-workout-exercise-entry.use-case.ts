import type { DeleteWorkoutExerciseEntryRequest, WorkoutSessionDto } from "@fitness/shared";
import { isCustomWorkoutProgramId } from "../../domain/models/custom-workout.js";
import type { ExerciseRepository } from "../../repositories/interfaces/exercise.repository.js";
import type { IdempotencyRepository } from "../../repositories/interfaces/idempotency.repository.js";
import type { ProgramRepository } from "../../repositories/interfaces/program.repository.js";
import type { WorkoutSessionRepository } from "../../repositories/interfaces/workout-session.repository.js";
import { WorkoutApplicationError } from "../errors/workout-application.error.js";
import { mapWorkoutSessionDto } from "../mappers/workout-dto.mapper.js";
import { IdempotencyService } from "../services/idempotency.service.js";
import type { TransactionManager } from "../services/transaction-manager.js";
import type { RequestContext } from "../types/request-context.js";
import type { UseCaseResult } from "../types/use-case-result.js";

function buildDeleteWorkoutExerciseEntryFingerprint(input: {
  sessionId: string;
  exerciseEntryId: string;
  request: DeleteWorkoutExerciseEntryRequest;
}) {
  return JSON.stringify({
    sessionId: input.sessionId,
    exerciseEntryId: input.exerciseEntryId,
    updatePlan: input.request.updatePlan ?? false
  });
}

export class DeleteWorkoutExerciseEntryUseCase {
  private readonly idempotencyService: IdempotencyService;

  public constructor(
    private readonly workoutSessionRepository: WorkoutSessionRepository,
    private readonly exerciseRepository: ExerciseRepository,
    private readonly programRepository: ProgramRepository,
    private readonly transactionManager: TransactionManager,
    idempotencyRepository: IdempotencyRepository
  ) {
    this.idempotencyService = new IdempotencyService(idempotencyRepository);
  }

  public async execute(input: {
    context: RequestContext;
    sessionId: string;
    exerciseEntryId: string;
    request: DeleteWorkoutExerciseEntryRequest;
    idempotencyKey: string;
  }): Promise<UseCaseResult<WorkoutSessionDto>> {
    const idempotentResult = await this.idempotencyService.execute({
      key: input.idempotencyKey,
      userId: input.context.userId,
      routeFamily: "delete_workout_exercise_entry",
      targetResourceId: input.sessionId,
      requestFingerprint: buildDeleteWorkoutExerciseEntryFingerprint({
        sessionId: input.sessionId,
        exerciseEntryId: input.exerciseEntryId,
        request: input.request
      }),
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
            "Exercises can only be removed from an in-progress workout session."
          );
        }

        const exerciseEntry = workoutSessionGraph.exerciseEntries.find((entry) => entry.id === input.exerciseEntryId) ?? null;
        if (!exerciseEntry) {
          throw new WorkoutApplicationError("EXERCISE_ENTRY_NOT_FOUND", "The exercise entry could not be found.");
        }

        const setList = workoutSessionGraph.sets
          .filter((set) => set.exerciseEntryId === exerciseEntry.id)
          .sort((left, right) => left.setNumber - right.setNumber);
        const hasLoggedSets = setList.some((set) => set.status !== "pending");
        if (hasLoggedSets) {
          throw new WorkoutApplicationError(
            "BUSINESS_RULE_VIOLATION",
            "This exercise can't be removed because it already has logged sets."
          );
        }

        const updatedGraph = await this.workoutSessionRepository.deleteWorkoutExerciseEntry(
          { exerciseEntryId: exerciseEntry.id },
          { tx }
        );

        if (input.request.updatePlan) {
          if (isCustomWorkoutProgramId(workoutSessionGraph.session.programId)) {
            throw new WorkoutApplicationError(
              "BUSINESS_RULE_VIOLATION",
              "The plan cannot be updated for ad hoc custom workouts."
            );
          }

          const programDefinition = await this.programRepository.findActiveById(
            workoutSessionGraph.session.programId,
            input.context.userId,
            { tx }
          );
          if (!programDefinition) {
            throw new WorkoutApplicationError("PROGRAM_NOT_FOUND", "The requested program could not be found.");
          }
          if (programDefinition.program.userId !== input.context.userId || programDefinition.program.source !== "custom") {
            throw new WorkoutApplicationError(
              "BUSINESS_RULE_VIOLATION",
              "The plan can only be updated for your custom programs."
            );
          }

          const templateEntryId = exerciseEntry.workoutTemplateExerciseEntryId ?? null;
          if (!templateEntryId) {
            throw new WorkoutApplicationError(
              "BUSINESS_RULE_VIOLATION",
              "This exercise cannot be applied back to the plan."
            );
          }

          await this.exerciseRepository.softDeleteWorkoutTemplateExerciseEntry(
            {
              workoutTemplateExerciseEntryId: templateEntryId,
              deletedAt: new Date()
            },
            { tx }
          );
        }

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

