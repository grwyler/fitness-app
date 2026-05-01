import type { CreateCustomProgramRequest, CreateCustomProgramResponse } from "@fitness/shared";
import type { ProgramRepository } from "../../repositories/interfaces/program.repository.js";
import type { IdempotencyRepository } from "../../repositories/interfaces/idempotency.repository.js";
import { WorkoutApplicationError } from "../errors/workout-application.error.js";
import { mapProgramDto } from "../mappers/workout-dto.mapper.js";
import { IdempotencyService } from "../services/idempotency.service.js";
import type { TransactionManager } from "../services/transaction-manager.js";
import type { RequestContext } from "../types/request-context.js";
import type { UseCaseResult } from "../types/use-case-result.js";

function normalizeName(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function normalizeOptionalDescription(value: string | null | undefined) {
  const normalized = (value ?? "").trim().replace(/\s+/g, " ");
  return normalized.length > 0 ? normalized : null;
}

function buildCreateCustomProgramFingerprint(request: CreateCustomProgramRequest) {
  return JSON.stringify({
    name: normalizeName(request.name),
    description: normalizeOptionalDescription(request.description),
    workouts: request.workouts.map((workout) => ({
      name: normalizeName(workout.name),
      exercises: workout.exercises.map((exercise) => ({
        exerciseId: exercise.exerciseId,
        targetSets: exercise.targetSets,
        targetReps: exercise.targetReps,
        repRangeMin: exercise.repRangeMin ?? null,
        repRangeMax: exercise.repRangeMax ?? null,
        restSeconds: exercise.restSeconds ?? null,
        progressionStrategy: exercise.progressionStrategy ?? null
      }))
    }))
  });
}

function validateCreateCustomProgramRequest(request: CreateCustomProgramRequest) {
  const name = normalizeName(request.name);
  if (!name) {
    throw new WorkoutApplicationError("VALIDATION_ERROR", "Program name is required.");
  }

  if (request.workouts.length === 0) {
    throw new WorkoutApplicationError("VALIDATION_ERROR", "Add at least one workout day.");
  }

  const workouts = request.workouts.map((workout, index) => {
    const workoutName = normalizeName(workout.name);
    if (!workoutName) {
      throw new WorkoutApplicationError("VALIDATION_ERROR", "Workout day name is required.");
    }

    if (workout.exercises.length === 0) {
      throw new WorkoutApplicationError(
        "VALIDATION_ERROR",
        `Add at least one exercise to ${workoutName}.`
      );
    }

    return {
      name: workoutName,
      sequenceOrder: index + 1,
      exercises: workout.exercises.map((exercise) => {
        if (!Number.isInteger(exercise.targetSets) || exercise.targetSets <= 0) {
          throw new WorkoutApplicationError("VALIDATION_ERROR", "Sets must be a positive number.");
        }

        if (!Number.isInteger(exercise.targetReps) || exercise.targetReps <= 0) {
          throw new WorkoutApplicationError("VALIDATION_ERROR", "Reps must be a positive number.");
        }

        const repRangeMin = exercise.repRangeMin ?? null;
        const repRangeMax = exercise.repRangeMax ?? null;
        if ((repRangeMin === null) !== (repRangeMax === null)) {
          throw new WorkoutApplicationError(
            "VALIDATION_ERROR",
            "Both repRangeMin and repRangeMax are required when using a rep range."
          );
        }
        if (repRangeMin !== null && repRangeMax !== null) {
          if (!Number.isInteger(repRangeMin) || repRangeMin <= 0) {
            throw new WorkoutApplicationError("VALIDATION_ERROR", "repRangeMin must be a positive number.");
          }
          if (!Number.isInteger(repRangeMax) || repRangeMax <= 0) {
            throw new WorkoutApplicationError("VALIDATION_ERROR", "repRangeMax must be a positive number.");
          }
          if (repRangeMax < repRangeMin) {
            throw new WorkoutApplicationError(
              "VALIDATION_ERROR",
              "repRangeMax must be greater than or equal to repRangeMin."
            );
          }
          if (exercise.targetReps < repRangeMin || exercise.targetReps > repRangeMax) {
            throw new WorkoutApplicationError(
              "VALIDATION_ERROR",
              "targetReps must be within the rep range."
            );
          }
        }

        return {
          exerciseId: exercise.exerciseId,
          targetSets: exercise.targetSets,
          targetReps: exercise.targetReps,
          repRangeMin,
          repRangeMax,
          restSeconds: exercise.restSeconds ?? null,
          progressionStrategy: exercise.progressionStrategy ?? null
        };
      })
    };
  });

  return {
    name,
    description: normalizeOptionalDescription(request.description),
    workouts
  };
}

export class CreateCustomProgramUseCase {
  private readonly idempotencyService: IdempotencyService;

  public constructor(
    private readonly programRepository: ProgramRepository,
    private readonly transactionManager: TransactionManager,
    idempotencyRepository: IdempotencyRepository
  ) {
    this.idempotencyService = new IdempotencyService(idempotencyRepository);
  }

  public async execute(input: {
    context: RequestContext;
    request: CreateCustomProgramRequest;
    idempotencyKey: string;
  }): Promise<UseCaseResult<CreateCustomProgramResponse>> {
    const validatedRequest = validateCreateCustomProgramRequest(input.request);
    const createCustomProgram = this.programRepository.createCustomProgram?.bind(this.programRepository);
    if (!createCustomProgram) {
      throw new Error("Custom program creation is not supported by this repository.");
    }

    const idempotentResult = await this.idempotencyService.execute<CreateCustomProgramResponse>({
      key: input.idempotencyKey,
      userId: input.context.userId,
      routeFamily: "create_custom_program",
      targetResourceId: null,
      requestFingerprint: buildCreateCustomProgramFingerprint(input.request),
      transactionManager: this.transactionManager,
      execute: async (tx) => {
        const programDefinition = await createCustomProgram(
          {
            userId: input.context.userId,
            name: validatedRequest.name,
            description: validatedRequest.description,
            workouts: validatedRequest.workouts,
            createdAt: new Date()
          },
          { tx }
        );

        return {
          program: mapProgramDto(programDefinition)
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
