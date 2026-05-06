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
    actualReps: request.actualReps ?? null,
    actualWeight: request.actualWeight ?? null,
    durationSeconds: request.durationSeconds ?? null,
    distanceMeters: request.distanceMeters ?? null,
    rounds: request.rounds ?? null,
    setType: request.setType ?? null,
    completedAt: request.completedAt ?? null,
    rir: request.rir ?? null,
    failureStatus: request.failureStatus ?? null
  });
}

function normalizeSetEffortForPersistence(request: LogSetRequest) {
  if (request.failureStatus === "muscular_failure" || request.failureStatus === "technical_failure") {
    return {
      rir: "rir_0" as const,
      failureStatus: request.failureStatus
    };
  }

  if (request.failureStatus === "stopped_early") {
    return {
      rir: null,
      failureStatus: "stopped_early" as const
    };
  }

  return {
    ...(request.rir !== undefined ? { rir: request.rir ?? null } : {}),
    ...(request.failureStatus !== undefined ? { failureStatus: request.failureStatus ?? null } : {})
  };
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

        if (setForUpdate.workoutSession.status === "completed") {
          throw new WorkoutApplicationError(
            "COMPLETED_WORKOUT_READ_ONLY",
            "Completed workouts are read-only for now."
          );
        }

        if (setForUpdate.workoutSession.status !== "in_progress") {
          throw new WorkoutApplicationError(
            "INVALID_SESSION_STATUS",
            "Sets can only be edited for in-progress workout sessions."
          );
        }

        if (setForUpdate.set.status === "pending") {
          throw new WorkoutApplicationError("SET_NOT_LOGGED", "Only logged sets can be edited.");
        }

        if (setForUpdate.set.status === "skipped") {
          throw new WorkoutApplicationError("SET_NOT_EDITABLE", "Skipped sets cannot be edited yet.");
        }

        const modality = setForUpdate.exerciseEntry.loggingModalitySnapshot;
        const completedAt = input.request.completedAt
          ? new Date(input.request.completedAt)
          : setForUpdate.set.completedAt ?? new Date();
        const nextSetType = input.request.setType ?? setForUpdate.set.setType;

        const requireNumber = (value: unknown, message: string): number => {
          if (typeof value !== "number" || !Number.isFinite(value)) {
            throw new WorkoutApplicationError("VALIDATION_ERROR", message);
          }
          return value;
        };

        const resolveUpdate = (): { update: Parameters<WorkoutSessionRepository["updateLoggedSet"]>[0] } => {
          if (modality === "reps_load" || modality === "reps_only") {
            const actualReps = requireNumber(
              input.request.actualReps ?? setForUpdate.set.actualReps ?? null,
              "actualReps is required."
            );

            const targetReps = setForUpdate.set.targetReps ?? null;
            const targetWeightLbs = setForUpdate.set.targetWeightLbs ?? null;

            const actualWeightLbs =
              input.request.actualWeight?.value ??
              setForUpdate.set.actualWeightLbs ??
              setForUpdate.set.targetWeightLbs ??
              (modality === "reps_only" ? 0 : null);

            if (modality === "reps_load" && (targetReps === null || targetWeightLbs === null || actualWeightLbs === null)) {
              throw new WorkoutApplicationError(
                "VALIDATION_ERROR",
                "This set requires reps and load targets but they were missing."
              );
            }

            const isOverperformanceSet =
              modality === "reps_load" && targetReps !== null && targetWeightLbs !== null && actualWeightLbs !== null
                ? isMaterialOverperformanceSet({
                    targetReps,
                    actualReps,
                    targetWeightLbs,
                    actualWeightLbs
                  })
                : false;

            const status =
              targetReps === null ? "completed" : actualReps >= targetReps || isOverperformanceSet ? "completed" : "failed";

            return {
              update: {
                setId: input.setId,
                actualReps,
                actualWeightLbs,
                actualDurationSeconds: null,
                actualDistanceMeters: null,
                actualRounds: null,
                setType: nextSetType,
                status,
                completedAt,
                ...normalizeSetEffortForPersistence(input.request)
              }
            };
          }

          if (modality === "time" || modality === "hold") {
            const durationSeconds = requireNumber(
              input.request.durationSeconds ?? setForUpdate.set.actualDurationSeconds ?? null,
              "durationSeconds is required."
            );

            return {
              update: {
                setId: input.setId,
                actualReps: null,
                actualWeightLbs: null,
                actualDurationSeconds: Math.floor(durationSeconds),
                actualDistanceMeters: null,
                actualRounds: null,
                setType: nextSetType,
                status: "completed",
                completedAt,
                ...normalizeSetEffortForPersistence(input.request)
              }
            };
          }

          if (modality === "time_distance") {
            const durationSeconds = input.request.durationSeconds ?? setForUpdate.set.actualDurationSeconds ?? null;
            const distanceMeters = input.request.distanceMeters ?? setForUpdate.set.actualDistanceMeters ?? null;
            if (durationSeconds === null && distanceMeters === null) {
              throw new WorkoutApplicationError(
                "VALIDATION_ERROR",
                "durationSeconds and/or distanceMeters is required."
              );
            }

            return {
              update: {
                setId: input.setId,
                actualReps: null,
                actualWeightLbs: null,
                actualDurationSeconds: durationSeconds === null ? null : Math.floor(requireNumber(durationSeconds, "Invalid durationSeconds.")),
                actualDistanceMeters: distanceMeters === null ? null : requireNumber(distanceMeters, "Invalid distanceMeters."),
                actualRounds: null,
                setType: nextSetType,
                status: "completed",
                completedAt,
                ...normalizeSetEffortForPersistence(input.request)
              }
            };
          }

          if (modality === "distance") {
            const distanceMeters = requireNumber(
              input.request.distanceMeters ?? setForUpdate.set.actualDistanceMeters ?? null,
              "distanceMeters is required."
            );

            const durationSeconds = input.request.durationSeconds ?? setForUpdate.set.actualDurationSeconds ?? null;
            return {
              update: {
                setId: input.setId,
                actualReps: null,
                actualWeightLbs: null,
                actualDurationSeconds: durationSeconds === null ? null : Math.floor(requireNumber(durationSeconds, "Invalid durationSeconds.")),
                actualDistanceMeters: distanceMeters,
                actualRounds: null,
                setType: nextSetType,
                status: "completed",
                completedAt,
                ...normalizeSetEffortForPersistence(input.request)
              }
            };
          }

          const rounds = input.request.rounds ?? setForUpdate.set.actualRounds ?? null;
          const durationSeconds = input.request.durationSeconds ?? setForUpdate.set.actualDurationSeconds ?? null;
          if (rounds === null && durationSeconds === null) {
            throw new WorkoutApplicationError(
              "VALIDATION_ERROR",
              "rounds and/or durationSeconds is required."
            );
          }

          return {
            update: {
              setId: input.setId,
              actualReps: null,
              actualWeightLbs: null,
              actualDurationSeconds: durationSeconds === null ? null : Math.floor(requireNumber(durationSeconds, "Invalid durationSeconds.")),
              actualDistanceMeters: null,
              actualRounds: rounds === null ? null : Math.floor(requireNumber(rounds, "Invalid rounds.")),
              setType: nextSetType,
              status: "completed",
              completedAt,
              ...normalizeSetEffortForPersistence(input.request)
            }
          };
        };

        const { update } = resolveUpdate();
        const updatedLoggedSet = await this.workoutSessionRepository.updateLoggedSet(update, { tx });

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
