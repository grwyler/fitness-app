import type { LogSetRequest, LogSetResponse } from "@fitness/shared";
import { isMaterialOverperformanceSet } from "../../domain/services/progression-engine.js";
import { ProgressionEngine } from "../../domain/services/progression-engine.js";
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
    actualReps: request.actualReps ?? null,
    actualWeight: request.actualWeight ?? null,
    durationSeconds: request.durationSeconds ?? null,
    distanceMeters: request.distanceMeters ?? null,
    rounds: request.rounds ?? null,
    setType: request.setType ?? null,
    completedAt: request.completedAt ?? null,
    rir: request.rir ?? null,
    failureStatus: request.failureStatus ?? null,
    tiers: request.tiers ?? null
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

export class LogSetUseCase {
  private readonly idempotencyService: IdempotencyService;
  private readonly validationService = new WorkoutValidationService();
  private readonly progressionEngine = new ProgressionEngine();

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

        if (setForLogging.set.tiers?.length) {
          const expected = setForLogging.set.tiers.map((tier) => tier.order).sort((a, b) => a - b);
          const received = (input.request.tiers ?? []).map((tier) => tier.order).sort((a, b) => a - b);
          if (expected.length !== received.length || expected.some((order, index) => order !== received[index])) {
            throw new WorkoutApplicationError("VALIDATION_ERROR", "Record a status for every tier in this extended set.");
          }
          for (const tier of input.request.tiers ?? []) {
            if (tier.status === "skipped") {
              if (tier.actualReps != null || tier.actualWeight != null) {
                throw new WorkoutApplicationError("VALIDATION_ERROR", "Skipped tiers cannot contain actual performance.");
              }
            } else if (tier.status === "completed" || tier.status === "failed") {
              if (tier.actualReps == null || (setForLogging.exerciseEntry.loggingModalitySnapshot === "reps_load" && tier.actualWeight == null)) {
                throw new WorkoutApplicationError("VALIDATION_ERROR", "Performed tiers require actual reps and load.");
              }
            }
          }
        }

        const modality = setForLogging.exerciseEntry.loggingModalitySnapshot;
        const completedAt = input.request.completedAt ? new Date(input.request.completedAt) : new Date();
        const nextSetType = input.request.setType ?? setForLogging.set.setType;

        const requireNumber = (value: unknown, message: string): number => {
          if (typeof value !== "number" || !Number.isFinite(value)) {
            throw new WorkoutApplicationError("VALIDATION_ERROR", message);
          }
          return value;
        };

        const resolveLoggedUpdate = (): { update: Parameters<WorkoutSessionRepository["updateLoggedSet"]>[0] } => {
          if (modality === "reps_load" || modality === "reps_only") {
            const actualReps = requireNumber(input.request.actualReps ?? null, "actualReps is required.");

            const targetReps = setForLogging.set.targetReps ?? null;
            const targetWeightLbs = setForLogging.set.targetWeightLbs ?? null;

            const actualWeightLbs =
              input.request.actualWeight?.value ??
              setForLogging.set.targetWeightLbs ??
              (modality === "reps_only" ? 0 : null);

            const isAmrapSet = setForLogging.set.repTargetText?.trim().toUpperCase() === "AMRAP";
            if (modality === "reps_load" && !setForLogging.set.tiers?.length && ((targetReps === null && !isAmrapSet) || targetWeightLbs === null || actualWeightLbs === null)) {
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
              setForLogging.set.tiers?.length && input.request.tiers?.some((tier) => {
                if (tier.status !== "completed") return true;
                const target = setForLogging.set.tiers?.find((item) => item.order === tier.order);
                return target?.targetReps != null && (tier.actualReps ?? 0) < target.targetReps;
              }) ? "failed" : targetReps === null ? "completed" : actualReps >= targetReps || isOverperformanceSet ? "completed" : "failed";

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
                ...normalizeSetEffortForPersistence(input.request),
                  tiers: input.request.tiers?.map((tier) => {
                  const target = setForLogging.set.tiers?.find((item) => item.order === tier.order);
                    return { ...target, order: tier.order, actualWeight: tier.status === "skipped" ? null : tier.actualWeight ?? null, actualReps: tier.status === "skipped" ? null : tier.actualReps ?? null, status: tier.status! };
                }) ?? setForLogging.set.tiers ?? null
              }
            };
          }

          if (modality === "time" || modality === "hold") {
            const durationSeconds = requireNumber(input.request.durationSeconds ?? null, "durationSeconds is required.");
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
            const durationSeconds = input.request.durationSeconds ?? null;
            const distanceMeters = input.request.distanceMeters ?? null;
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
            const distanceMeters = requireNumber(input.request.distanceMeters ?? null, "distanceMeters is required.");
            return {
              update: {
                setId: input.setId,
                actualReps: null,
                actualWeightLbs: null,
                actualDurationSeconds: input.request.durationSeconds ?? null,
                actualDistanceMeters: distanceMeters,
                actualRounds: null,
                setType: nextSetType,
                status: "completed",
                completedAt,
                ...normalizeSetEffortForPersistence(input.request)
              }
            };
          }

          // interval
          const rounds = input.request.rounds ?? null;
          const durationSeconds = input.request.durationSeconds ?? null;
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

        const { update } = resolveLoggedUpdate();

        const updatedLoggedSet = await this.workoutSessionRepository.updateLoggedSet(update, { tx });

        let workoutSessionGraph = await this.workoutSessionRepository.findOwnedSessionGraphById(
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

        const entry = workoutSessionGraph.exerciseEntries.find((item) => item.id === updatedLoggedSet.exerciseEntry.id);
        const logged = workoutSessionGraph.sets.find((item) => item.id === input.setId);
        if (entry && logged && logged.setType !== "warmup" && this.workoutSessionRepository.updatePendingSetTargets) {
          const pending = workoutSessionGraph.sets.filter((item) => item.exerciseEntryId === entry.id && item.status === "pending");
          const targets = this.progressionEngine.adaptRemainingTargets({
            targetReps: logged.targetReps,
            targetWeightLbs: logged.targetWeightLbs,
            actualReps: logged.actualReps,
            actualWeightLbs: logged.actualWeightLbs,
            status: logged.status === "failed" ? "failed" : "completed",
            rir: logged.rir,
            repRangeMin: entry.repRangeMin ?? logged.targetReps ?? 1,
            repRangeMax: entry.repRangeMax ?? logged.targetReps ?? Number.MAX_SAFE_INTEGER,
            ...(logged.tiers !== undefined ? { tiers: logged.tiers } : {}),
            pending: pending.map((set) => ({ setId: set.id, targetReps: set.targetReps, targetWeightLbs: set.targetWeightLbs, ...(set.tiers !== undefined ? { tiers: set.tiers } : {}), adaptationReason: set.adaptationReason ?? null }))
          });
          if (targets.length > 0) {
            if (targets.length > 0) {
              await this.workoutSessionRepository.updatePendingSetTargets({ exerciseEntryId: entry.id, targets }, { tx });
              workoutSessionGraph = await this.workoutSessionRepository.findOwnedSessionGraphById(
                input.context.userId,
                updatedLoggedSet.workoutSession.id,
                { tx }
              );
              if (!workoutSessionGraph) {
                throw new WorkoutApplicationError("SESSION_NOT_FOUND", "The workout could not be reloaded after adapting upcoming targets.");
              }
            }
          }
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
