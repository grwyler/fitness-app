import type { UpdateCustomProgramRequest, UpdateCustomProgramResponse } from "@fitness/shared";
import { resolveCustomProgramName } from "@fitness/shared";
import type { ProgramRepository } from "../../repositories/interfaces/program.repository.js";
import { WorkoutApplicationError } from "../errors/workout-application.error.js";
import { mapProgramDto } from "../mappers/workout-dto.mapper.js";
import type { TransactionManager } from "../services/transaction-manager.js";
import type { RequestContext } from "../types/request-context.js";
import type { UseCaseResult } from "../types/use-case-result.js";

function normalizeOptionalDescription(value: string | null | undefined) {
  const normalized = (value ?? "").trim().replace(/\s+/g, " ");
  return normalized.length > 0 ? normalized : null;
}

function normalizeOptionalShortText(value: string | null | undefined) {
  const normalized = (value ?? "").trim().replace(/\s+/g, " ");
  return normalized.length > 0 ? normalized : null;
}

function validateUpdateCustomProgramRequest(request: UpdateCustomProgramRequest) {
  const name = resolveCustomProgramName(request.name);

  if (request.workouts.length === 0) {
    throw new WorkoutApplicationError("VALIDATION_ERROR", "Add at least one workout day.");
  }

  const workouts = request.workouts.map((workout, index) => {
    const workoutName = workout.name.trim().replace(/\s+/g, " ");
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
        const workoutTemplateExerciseEntryId = exercise.workoutTemplateExerciseEntryId?.trim() || null;
        if (!Number.isInteger(exercise.targetSets) || exercise.targetSets <= 0) {
          throw new WorkoutApplicationError("VALIDATION_ERROR", "Sets must be a positive number.");
        }

        const targetReps = exercise.targetReps ?? null;
        if (targetReps !== null) {
          if (!Number.isInteger(targetReps) || targetReps <= 0) {
            throw new WorkoutApplicationError("VALIDATION_ERROR", "Reps must be a positive number.");
          }
        }

        const repRangeMin = exercise.repRangeMin ?? null;
        const repRangeMax = exercise.repRangeMax ?? null;
        if ((repRangeMin === null) !== (repRangeMax === null)) {
          throw new WorkoutApplicationError(
            "VALIDATION_ERROR",
            "Both repRangeMin and repRangeMax are required when using a rep range."
          );
        }
        if ((repRangeMin !== null || repRangeMax !== null) && targetReps === null) {
          throw new WorkoutApplicationError("VALIDATION_ERROR", "targetReps is required when using a rep range.");
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
          if (targetReps! < repRangeMin || targetReps! > repRangeMax) {
            throw new WorkoutApplicationError(
              "VALIDATION_ERROR",
              "targetReps must be within the rep range."
            );
          }
        }

        const repTargetText = normalizeOptionalShortText(exercise.repTargetText);
        const notes = normalizeOptionalDescription(exercise.notes);
        const setTargets = exercise.setTargets?.length ? exercise.setTargets : null;

        const targetDurationSeconds = exercise.targetDurationSeconds ?? null;
        if (targetDurationSeconds !== null) {
          if (!Number.isInteger(targetDurationSeconds) || targetDurationSeconds <= 0) {
            throw new WorkoutApplicationError("VALIDATION_ERROR", "targetDurationSeconds must be a positive number.");
          }
        }

        const targetDistanceMeters = exercise.targetDistanceMeters ?? null;
        if (targetDistanceMeters !== null) {
          if (typeof targetDistanceMeters !== "number" || !Number.isFinite(targetDistanceMeters) || targetDistanceMeters < 0) {
            throw new WorkoutApplicationError("VALIDATION_ERROR", "targetDistanceMeters must be a valid number.");
          }
        }

        const targetRounds = exercise.targetRounds ?? null;
        if (targetRounds !== null) {
          if (!Number.isInteger(targetRounds) || targetRounds <= 0) {
            throw new WorkoutApplicationError("VALIDATION_ERROR", "targetRounds must be a positive number.");
          }
        }

        if (setTargets && setTargets.length !== exercise.targetSets) {
          throw new WorkoutApplicationError(
            "VALIDATION_ERROR",
            "Custom set targets must match the sets count."
          );
        }

        return {
          exerciseId: exercise.exerciseId,
          workoutTemplateExerciseEntryId,
          targetSets: exercise.targetSets,
          targetReps,
          repRangeMin,
          repRangeMax,
          targetDurationSeconds,
          targetDistanceMeters,
          targetRounds,
          restSeconds: exercise.restSeconds ?? null,
          progressionStrategy: exercise.progressionStrategy ?? null,
          ...(repTargetText ? { repTargetText } : {}),
          ...(exercise.targetWeight ? { targetWeight: exercise.targetWeight } : {}),
          ...(notes ? { notes } : {}),
          ...(setTargets ? { setTargets } : {})
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

export class UpdateCustomProgramUseCase {
  public constructor(
    private readonly programRepository: ProgramRepository,
    private readonly transactionManager: TransactionManager
  ) {}

  public async execute(input: {
    context: RequestContext;
    programId: string;
    request: UpdateCustomProgramRequest;
  }): Promise<UseCaseResult<UpdateCustomProgramResponse>> {
    const validatedRequest = validateUpdateCustomProgramRequest(input.request);
    const updateCustomProgram = this.programRepository.updateCustomProgram?.bind(this.programRepository);
    if (!updateCustomProgram) {
      throw new Error("Custom program editing is not supported by this repository.");
    }

    const programDefinition = await this.transactionManager.runInTransaction(async (tx) =>
      updateCustomProgram(
        {
          programId: input.programId,
          userId: input.context.userId,
          name: validatedRequest.name,
          description: validatedRequest.description,
          workouts: validatedRequest.workouts,
          updatedAt: new Date()
        },
        { tx }
      )
    );

    if (!programDefinition) {
      throw new WorkoutApplicationError("PROGRAM_NOT_FOUND", "The requested custom program could not be found.");
    }

    return {
      data: {
        program: mapProgramDto(programDefinition)
      },
      meta: {
        replayed: false
      }
    };
  }
}
