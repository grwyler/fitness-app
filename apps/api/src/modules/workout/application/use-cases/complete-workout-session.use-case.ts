import type {
  CompleteWorkoutSessionRequest,
  CompleteWorkoutSessionResponse
} from "@fitness/shared";
import { isCustomWorkoutProgramId } from "../../domain/models/custom-workout.js";
import { ProgramAdvancementPolicy } from "../../domain/services/program-advancement-policy.js";
import { ProgressionEngine } from "../../domain/services/progression-engine.js";
import { WorkoutValidationService } from "../../domain/services/workout-validation-service.js";
import type { EnrollmentRepository } from "../../repositories/interfaces/enrollment.repository.js";
import type { ExerciseRepository } from "../../repositories/interfaces/exercise.repository.js";
import type { IdempotencyRepository } from "../../repositories/interfaces/idempotency.repository.js";
import type { ProgressMetricRepository } from "../../repositories/interfaces/progress-metric.repository.js";
import type { ProgressionStateRepository } from "../../repositories/interfaces/progression-state.repository.js";
import type { ProgressionStateV2Repository } from "../../repositories/interfaces/progression-state-v2.repository.js";
import type { WorkoutSessionRepository } from "../../repositories/interfaces/workout-session.repository.js";
import {
  mapNextWorkoutTemplateDto,
  mapProgressMetricDto,
  mapProgressionUpdateDto,
  mapWorkoutSessionDto
} from "../mappers/workout-dto.mapper.js";
import { WorkoutApplicationError } from "../errors/workout-application.error.js";
import { IdempotencyService } from "../services/idempotency.service.js";
import type { TransactionManager } from "../services/transaction-manager.js";
import type { RequestContext } from "../types/request-context.js";
import type { UseCaseResult } from "../types/use-case-result.js";

function buildCompleteWorkoutFingerprint(sessionId: string, request: CompleteWorkoutSessionRequest) {
  return JSON.stringify({
    sessionId,
    completedAt: request.completedAt ?? null,
    exerciseFeedback: [...request.exerciseFeedback].sort((left, right) =>
      left.exerciseEntryId.localeCompare(right.exerciseEntryId)
    ),
    userEffortFeedback: request.userEffortFeedback ?? null,
    finishEarly: request.finishEarly ?? false
  });
}

export class CompleteWorkoutSessionUseCase {
  private readonly idempotencyService: IdempotencyService;
  private readonly progressionEngine = new ProgressionEngine();
  private readonly programAdvancementPolicy = new ProgramAdvancementPolicy();
  private readonly validationService = new WorkoutValidationService();

  public constructor(
    private readonly workoutSessionRepository: WorkoutSessionRepository,
    private readonly enrollmentRepository: EnrollmentRepository,
    private readonly progressionStateRepository: ProgressionStateRepository,
    private readonly progressionStateV2Repository: ProgressionStateV2Repository,
    private readonly exerciseRepository: ExerciseRepository,
    private readonly progressMetricRepository: ProgressMetricRepository,
    private readonly transactionManager: TransactionManager,
    idempotencyRepository: IdempotencyRepository
  ) {
    this.idempotencyService = new IdempotencyService(idempotencyRepository);
  }

  public async execute(input: {
    context: RequestContext;
    sessionId: string;
    request: CompleteWorkoutSessionRequest;
    idempotencyKey: string;
  }): Promise<UseCaseResult<CompleteWorkoutSessionResponse>> {
    const idempotentResult = await this.idempotencyService.execute({
      key: input.idempotencyKey,
      userId: input.context.userId,
      routeFamily: "complete_workout_session",
      targetResourceId: input.sessionId,
      requestFingerprint: buildCompleteWorkoutFingerprint(input.sessionId, input.request),
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

        const exerciseFeedbackByEntryId = Object.fromEntries(
          input.request.exerciseFeedback.map((exerciseFeedback) => [
            exerciseFeedback.exerciseEntryId,
            exerciseFeedback.effortFeedback
          ])
        );

        this.validationService.assertWorkoutCanBeCompleted({
          workoutSessionStatus: workoutSessionGraph.session.status,
          allowPartialCompletion: input.request.finishEarly === true,
          exercises: workoutSessionGraph.exerciseEntries.map((exerciseEntry) => ({
            exerciseEntryId: exerciseEntry.id,
            setStatuses: workoutSessionGraph.sets
              .filter((set) => set.exerciseEntryId === exerciseEntry.id)
              .map((set) => set.status)
          })),
          exerciseFeedback: exerciseFeedbackByEntryId
        });

        const isCustomWorkout = isCustomWorkoutProgramId(workoutSessionGraph.session.programId);

        const activeEnrollment = isCustomWorkout
          ? null
          : await this.enrollmentRepository.findActiveByUserId(input.context.userId, {
              tx
            });
        if (!isCustomWorkout && !activeEnrollment) {
          throw new WorkoutApplicationError(
            "ACTIVE_ENROLLMENT_NOT_FOUND",
            "The user does not have an active enrollment."
          );
        }

        const completedAt = input.request.completedAt ? new Date(input.request.completedAt) : new Date();
        const hasPendingSets = workoutSessionGraph.sets.some((set) => set.status === "pending");
        if (hasPendingSets) {
          await this.workoutSessionRepository.skipPendingWorkoutSets(
            { sessionId: workoutSessionGraph.session.id, skippedAt: completedAt },
            { tx }
          );
          workoutSessionGraph.sets = workoutSessionGraph.sets.map((set) =>
            set.status === "pending"
              ? {
                  ...set,
                  status: "skipped",
                  completedAt
                }
              : set
          );
        }

        const isPartial = workoutSessionGraph.sets.some((set) => set.status === "skipped");

        const exerciseIds = [...new Set(workoutSessionGraph.exerciseEntries.map((exerciseEntry) => exerciseEntry.exerciseId))];
        const progressionSeeds = await this.exerciseRepository.findProgressionSeedsByExerciseIds(exerciseIds, { tx });
        const progressionSeedByExerciseId = new Map(
          progressionSeeds.map((progressionSeed) => [progressionSeed.exerciseId, progressionSeed])
        );

        const fullyLoggedExerciseEntries = workoutSessionGraph.exerciseEntries.filter((exerciseEntry) => {
          const relatedSets = workoutSessionGraph.sets.filter((set) => set.exerciseEntryId === exerciseEntry.id);
          return relatedSets.length > 0 && relatedSets.every((set) => set.status === "completed" || set.status === "failed");
        });

        const partialExerciseEntries = workoutSessionGraph.exerciseEntries.filter((exerciseEntry) => {
          const relatedSets = workoutSessionGraph.sets.filter((set) => set.exerciseEntryId === exerciseEntry.id);
          return relatedSets.length > 0 && relatedSets.some((set) => set.status === "skipped" || set.status === "pending");
        });

        const progressionEligibleExerciseEntries = fullyLoggedExerciseEntries.filter((exerciseEntry) => {
          const progressionSeed = progressionSeedByExerciseId.get(exerciseEntry.exerciseId);
          return progressionSeed?.isProgressionEligible ?? true;
        });

        const unresolvedTemplateEntrySequenceOrders = progressionEligibleExerciseEntries
          .filter((entry) => entry.workoutTemplateExerciseEntryId === null)
          .map((entry) => entry.sequenceOrder);

        const fallbackTemplateEntryIds =
          unresolvedTemplateEntrySequenceOrders.length > 0 && !isCustomWorkout
            ? await this.exerciseRepository.findTemplateExerciseEntryIdsByTemplateIdAndSequenceOrders(
                workoutSessionGraph.session.workoutTemplateId,
                unresolvedTemplateEntrySequenceOrders,
                { tx }
              )
            : [];
        const fallbackTemplateEntryIdBySequenceOrder = new Map(
          fallbackTemplateEntryIds.map((row) => [row.sequenceOrder, row.workoutTemplateExerciseEntryId])
        );

        const progressionEligibleEntriesWithTemplateEntry = progressionEligibleExerciseEntries
          .map((entry) => ({
            entry,
            workoutTemplateExerciseEntryId:
              entry.workoutTemplateExerciseEntryId ??
              fallbackTemplateEntryIdBySequenceOrder.get(entry.sequenceOrder) ??
              null
          }))
          .filter(
            (row): row is { entry: typeof progressionEligibleExerciseEntries[number]; workoutTemplateExerciseEntryId: string } =>
              row.workoutTemplateExerciseEntryId !== null
          );

        const progressionStatesV1 = await this.progressionStateRepository.findByUserIdAndExerciseIds(
          input.context.userId,
          progressionEligibleExerciseEntries.map((exerciseEntry) => exerciseEntry.exerciseId),
          { tx }
        );
        const progressionStateV1ByExerciseId = new Map(
          progressionStatesV1.map((progressionState) => [progressionState.exerciseId, progressionState])
        );

        const v2TemplateEntryIds = progressionEligibleEntriesWithTemplateEntry.map((row) => row.workoutTemplateExerciseEntryId);
        const existingV2States = await this.progressionStateV2Repository.findByUserIdAndTemplateEntryIds(
          input.context.userId,
          v2TemplateEntryIds,
          { tx }
        );
        const v2StateByTemplateEntryId = new Map(
          existingV2States.map((state) => [state.workoutTemplateExerciseEntryId, state])
        );

        const v2CreateInputs = progressionEligibleEntriesWithTemplateEntry
          .filter((row) => !v2StateByTemplateEntryId.has(row.workoutTemplateExerciseEntryId))
          .map((row) => {
            const exerciseEntry = row.entry;
            const progressionSeed = progressionSeedByExerciseId.get(exerciseEntry.exerciseId);
            if (!progressionSeed) {
              throw new WorkoutApplicationError(
                "PROGRESSION_SEED_NOT_FOUND",
                `Progression seed not found for exercise ${exerciseEntry.exerciseId}.`
              );
            }

            const v1State = progressionStateV1ByExerciseId.get(exerciseEntry.exerciseId) ?? null;
            const repRangeMin = exerciseEntry.targetReps;
            const repRangeMax = exerciseEntry.targetReps;

            return {
              userId: input.context.userId,
              workoutTemplateExerciseEntryId: row.workoutTemplateExerciseEntryId,
              currentWeightLbs: v1State?.currentWeightLbs ?? progressionSeed.defaultStartingWeightLbs,
              lastCompletedWeightLbs: v1State?.lastCompletedWeightLbs ?? null,
              repGoal: repRangeMin,
              repRangeMin,
              repRangeMax,
              consecutiveFailures: v1State?.consecutiveFailures ?? 0,
              lastEffortFeedback: v1State?.lastEffortFeedback ?? null,
              lastPerformedAt: v1State?.lastPerformedAt ?? null
            };
          });

        const createdV2States =
          v2CreateInputs.length > 0
            ? await this.progressionStateV2Repository.createMany(v2CreateInputs, { tx })
            : [];

        for (const created of createdV2States) {
          v2StateByTemplateEntryId.set(created.workoutTemplateExerciseEntryId, created);
        }

        const progressionUpdatesV2 = progressionEligibleEntriesWithTemplateEntry.map(
          ({ entry, workoutTemplateExerciseEntryId }) => {
            const exerciseEntry = entry;
            const progressionSeed = progressionSeedByExerciseId.get(exerciseEntry.exerciseId);

            if (!progressionSeed) {
              throw new WorkoutApplicationError(
                "PROGRESSION_SEED_NOT_FOUND",
                `Progression seed not found for exercise ${exerciseEntry.exerciseId}.`
              );
            }

            const progressionStateV2 = v2StateByTemplateEntryId.get(workoutTemplateExerciseEntryId);
            if (!progressionStateV2) {
              throw new WorkoutApplicationError(
                "PROGRESSION_STATE_NOT_FOUND",
                `Progression state v2 not found for template entry ${workoutTemplateExerciseEntryId}.`
              );
            }

            const relatedSets = workoutSessionGraph.sets.filter((set) => set.exerciseEntryId === exerciseEntry.id);
            const hasFailure = relatedSets.some((set) => set.status === "failed");
            const effortFeedback = exerciseFeedbackByEntryId[exerciseEntry.id];
            if (!effortFeedback) {
              throw new WorkoutApplicationError(
                "PROGRESSION_SEED_NOT_FOUND",
                `Effort feedback missing for exercise entry ${exerciseEntry.id}.`
              );
            }

            const progressionResult = this.progressionEngine.calculate({
              state: {
                currentWeightLbs: progressionStateV2.currentWeightLbs,
                lastCompletedWeightLbs: progressionStateV2.lastCompletedWeightLbs,
                consecutiveFailures: progressionStateV2.consecutiveFailures,
                lastEffortFeedback: progressionStateV2.lastEffortFeedback
              },
              exercise: {
                exerciseName: exerciseEntry.exerciseNameSnapshot,
                exerciseCategory: progressionSeed.exerciseCategory,
                incrementLbs: progressionSeed.incrementLbs,
                isBodyweight: progressionSeed.isBodyweight,
                isWeightOptional: progressionSeed.isWeightOptional
              },
              outcome: {
                effortFeedback,
                hasFailure,
                sets: relatedSets.map((set) => ({
                  targetReps: set.targetReps,
                  actualReps: set.actualReps,
                  targetWeightLbs: set.targetWeightLbs,
                  actualWeightLbs: set.actualWeightLbs
                }))
              }
            });

            return {
              exerciseEntry,
              workoutTemplateExerciseEntryId,
              progressionResult
            };
          }
        );

        const feedbackInputs = workoutSessionGraph.exerciseEntries
          .filter((exerciseEntry) => exerciseFeedbackByEntryId[exerciseEntry.id] !== undefined)
          .map((exerciseEntry) => ({
            exerciseEntryId: exerciseEntry.id,
            effortFeedback: exerciseFeedbackByEntryId[exerciseEntry.id]!,
            completedAt
          }));
        if (feedbackInputs.length > 0) {
          await this.workoutSessionRepository.persistExerciseEntryFeedback(feedbackInputs, { tx });
        }

        await this.progressionStateV2Repository.updateMany(
          progressionUpdatesV2.map(({ workoutTemplateExerciseEntryId, progressionResult }) => {
            const existing = v2StateByTemplateEntryId.get(workoutTemplateExerciseEntryId);
            if (!existing) {
              throw new WorkoutApplicationError(
                "PROGRESSION_STATE_NOT_FOUND",
                `Progression state v2 not found for template entry ${workoutTemplateExerciseEntryId}.`
              );
            }

            return {
              userId: input.context.userId,
              workoutTemplateExerciseEntryId,
              currentWeightLbs: progressionResult.nextState.currentWeightLbs,
              lastCompletedWeightLbs: progressionResult.nextState.lastCompletedWeightLbs,
              repGoal: existing.repGoal,
              repRangeMin: existing.repRangeMin,
              repRangeMax: existing.repRangeMax,
              consecutiveFailures: progressionResult.nextState.consecutiveFailures,
              lastEffortFeedback: progressionResult.nextState.lastEffortFeedback,
              lastPerformedAt: completedAt
            };
          }),
          { tx }
        );

        const progressionUpdatesV1 = progressionEligibleExerciseEntries.map((exerciseEntry) => {
          const progressionSeed = progressionSeedByExerciseId.get(exerciseEntry.exerciseId);
          if (!progressionSeed) {
            throw new WorkoutApplicationError(
              "PROGRESSION_SEED_NOT_FOUND",
              `Progression seed not found for exercise ${exerciseEntry.exerciseId}.`
            );
          }

          const progressionState = progressionStateV1ByExerciseId.get(exerciseEntry.exerciseId);
          if (!progressionState) {
            throw new WorkoutApplicationError(
              "PROGRESSION_STATE_NOT_FOUND",
              `Progression state not found for exercise ${exerciseEntry.exerciseId}.`
            );
          }

          const relatedSets = workoutSessionGraph.sets.filter((set) => set.exerciseEntryId === exerciseEntry.id);
          const hasFailure = relatedSets.some((set) => set.status === "failed");
          const effortFeedback = exerciseFeedbackByEntryId[exerciseEntry.id];
          if (!effortFeedback) {
            throw new WorkoutApplicationError(
              "PROGRESSION_SEED_NOT_FOUND",
              `Effort feedback missing for exercise entry ${exerciseEntry.id}.`
            );
          }

          const progressionResult = this.progressionEngine.calculate({
            state: {
              currentWeightLbs: progressionState.currentWeightLbs,
              lastCompletedWeightLbs: progressionState.lastCompletedWeightLbs,
              consecutiveFailures: progressionState.consecutiveFailures,
              lastEffortFeedback: progressionState.lastEffortFeedback
            },
            exercise: {
              exerciseName: exerciseEntry.exerciseNameSnapshot,
              exerciseCategory: progressionSeed.exerciseCategory,
              incrementLbs: progressionSeed.incrementLbs,
              isBodyweight: progressionSeed.isBodyweight,
              isWeightOptional: progressionSeed.isWeightOptional
            },
            outcome: {
              effortFeedback,
              hasFailure,
              sets: relatedSets.map((set) => ({
                targetReps: set.targetReps,
                actualReps: set.actualReps,
                targetWeightLbs: set.targetWeightLbs,
                actualWeightLbs: set.actualWeightLbs
              }))
            }
          });

          return {
            exerciseEntry,
            progressionResult
          };
        });

        await this.progressionStateRepository.updateMany(
          progressionUpdatesV1.map(({ exerciseEntry, progressionResult }) => ({
            userId: input.context.userId,
            exerciseId: exerciseEntry.exerciseId,
            currentWeightLbs: progressionResult.nextState.currentWeightLbs,
            lastCompletedWeightLbs: progressionResult.nextState.lastCompletedWeightLbs,
            consecutiveFailures: progressionResult.nextState.consecutiveFailures,
            lastEffortFeedback: progressionResult.nextState.lastEffortFeedback,
            lastPerformedAt: completedAt
          })),
          { tx }
        );

        const progressMetricInputs = [
          ...progressionUpdatesV2
            .filter(({ progressionResult }) =>
              progressionResult.result === "increased" || progressionResult.result === "recalibrated"
            )
            .map(({ exerciseEntry, progressionResult }) => ({
              userId: input.context.userId,
              exerciseId: exerciseEntry.exerciseId,
              workoutSessionId: workoutSessionGraph.session.id,
              metricType: "weight_increase" as const,
              metricValue: progressionResult.nextWeightLbs - progressionResult.previousWeightLbs,
              displayText:
                progressionResult.result === "recalibrated"
                  ? `Adjusted ${exerciseEntry.exerciseNameSnapshot} working weight based on your performance`
                  : `+${progressionResult.nextWeightLbs - progressionResult.previousWeightLbs} lbs on ${exerciseEntry.exerciseNameSnapshot}`,
              recordedAt: completedAt
            })),
          {
            userId: input.context.userId,
            exerciseId: null,
            workoutSessionId: workoutSessionGraph.session.id,
            metricType: "workout_completed" as const,
            metricValue: 1,
            displayText: "Workout completed",
            recordedAt: completedAt
          }
        ];

        const createdProgressMetrics = await this.progressMetricRepository.createMany(progressMetricInputs, {
          tx
        });

        const durationSeconds =
          workoutSessionGraph.session.startedAt === null
            ? 0
            : Math.max(
                1,
                Math.floor((completedAt.getTime() - workoutSessionGraph.session.startedAt.getTime()) / 1000)
              );

        await this.workoutSessionRepository.completeSession(
          {
            sessionId: workoutSessionGraph.session.id,
            completedAt,
            durationSeconds,
            isPartial,
            userEffortFeedback: input.request.userEffortFeedback ?? null
          },
          { tx }
        );

        let nextWorkoutTemplate = null;
        if (!isCustomWorkout && activeEnrollment) {
          const activeTemplates = await this.exerciseRepository.findActiveTemplatesByProgramId(
            activeEnrollment.programId,
            { tx }
          );

          const nextTemplateId = this.programAdvancementPolicy.resolveNextTemplateId({
            templates: activeTemplates.map((template) => ({
              id: template.id,
              sequenceOrder: template.sequenceOrder
            })),
            currentTemplateId: activeEnrollment.currentWorkoutTemplateId,
            completedTemplateId: workoutSessionGraph.session.workoutTemplateId,
            workoutSessionStatus: "completed"
          });

          const updatedEnrollment = await this.enrollmentRepository.updateNextWorkoutTemplate(
            {
              enrollmentId: activeEnrollment.id,
              nextWorkoutTemplateId: nextTemplateId
            },
            { tx }
          );

          nextWorkoutTemplate =
            activeTemplates.find((template) => template.id === updatedEnrollment.currentWorkoutTemplateId) ??
            activeTemplates.find((template) => template.id === nextTemplateId) ??
            null;
        }

        const completedWorkoutSessionGraph = await this.workoutSessionRepository.findOwnedSessionGraphById(
          input.context.userId,
          workoutSessionGraph.session.id,
          { tx }
        );
        if (!completedWorkoutSessionGraph) {
          throw new WorkoutApplicationError(
            "SESSION_NOT_FOUND",
            "The completed workout session could not be reloaded."
          );
        }

        return {
          workoutSession: mapWorkoutSessionDto(completedWorkoutSessionGraph),
          progressionUpdates: [
            ...progressionUpdatesV2.map(({ exerciseEntry, progressionResult }) =>
              mapProgressionUpdateDto({
                exerciseId: exerciseEntry.exerciseId,
                exerciseName: exerciseEntry.exerciseNameSnapshot,
                previousWeightLbs: progressionResult.previousWeightLbs,
                nextWeightLbs: progressionResult.nextWeightLbs,
                result: progressionResult.result,
                reason: progressionResult.reason
              })
            ),
            ...partialExerciseEntries.map((exerciseEntry) => {
              const relatedSets = workoutSessionGraph.sets.filter((set) => set.exerciseEntryId === exerciseEntry.id);
              const loggedSetCount = relatedSets.filter((set) => set.status === "completed" || set.status === "failed").length;
              const totalSetCount = relatedSets.length;
              return mapProgressionUpdateDto({
                exerciseId: exerciseEntry.exerciseId,
                exerciseName: exerciseEntry.exerciseNameSnapshot,
                previousWeightLbs: exerciseEntry.targetWeightLbs,
                nextWeightLbs: exerciseEntry.targetWeightLbs,
                result: "skipped",
                reason: `No progression update because this exercise was only partially completed (${loggedSetCount} of ${totalSetCount} sets logged; unlogged sets were skipped).`
              });
            })
          ],
          progressMetrics: createdProgressMetrics.map(mapProgressMetricDto),
          nextWorkoutTemplate: mapNextWorkoutTemplateDto(nextWorkoutTemplate)
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
