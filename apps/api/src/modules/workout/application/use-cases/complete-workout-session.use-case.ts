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
        const isPartial = workoutSessionGraph.sets.some(
          (set) => set.status === "pending" || set.status === "skipped"
        );
        const completedExerciseEntries = workoutSessionGraph.exerciseEntries.filter((exerciseEntry) => {
          const relatedSets = workoutSessionGraph.sets.filter((set) => set.exerciseEntryId === exerciseEntry.id);
          return (
            relatedSets.length > 0 &&
            relatedSets.every((set) => set.status === "completed" || set.status === "failed")
          );
        });
        const exerciseIds = completedExerciseEntries.map((exerciseEntry) => exerciseEntry.exerciseId);
        const progressionSeeds = await this.exerciseRepository.findProgressionSeedsByExerciseIds(exerciseIds, {
          tx
        });
        const progressionSeedByExerciseId = new Map(
          progressionSeeds.map((progressionSeed) => [progressionSeed.exerciseId, progressionSeed])
        );

        const progressionEligibleExerciseEntries = completedExerciseEntries.filter((exerciseEntry) => {
          const progressionSeed = progressionSeedByExerciseId.get(exerciseEntry.exerciseId);
          return progressionSeed?.isProgressionEligible ?? true;
        });

        const progressionStates = await this.progressionStateRepository.findByUserIdAndExerciseIds(
          input.context.userId,
          progressionEligibleExerciseEntries.map((exerciseEntry) => exerciseEntry.exerciseId),
          { tx }
        );
        const progressionStateByExerciseId = new Map(
          progressionStates.map((progressionState) => [progressionState.exerciseId, progressionState])
        );

        const progressionUpdates = progressionEligibleExerciseEntries.map((exerciseEntry) => {
          const progressionSeed = progressionSeedByExerciseId.get(exerciseEntry.exerciseId);
          if (!progressionSeed) {
            throw new WorkoutApplicationError(
              "PROGRESSION_SEED_NOT_FOUND",
              `Progression seed not found for exercise ${exerciseEntry.exerciseId}.`
            );
          }

          const progressionState = progressionStateByExerciseId.get(exerciseEntry.exerciseId);
          if (!progressionState) {
            throw new WorkoutApplicationError(
              "PROGRESSION_STATE_NOT_FOUND",
              `Progression state not found for exercise ${exerciseEntry.exerciseId}.`
            );
          }

          const relatedSets = workoutSessionGraph.sets.filter(
            (set) => set.exerciseEntryId === exerciseEntry.id
          );
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
              incrementLbs: progressionSeed.incrementLbs
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

        await this.workoutSessionRepository.persistExerciseEntryFeedback(
          progressionUpdates.map(({ exerciseEntry }) => ({
            exerciseEntryId: exerciseEntry.id,
            effortFeedback: exerciseFeedbackByEntryId[exerciseEntry.id]!,
            completedAt
          })),
          { tx }
        );

        await this.progressionStateRepository.updateMany(
          progressionUpdates.map(({ exerciseEntry, progressionResult }) => ({
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
          ...progressionUpdates
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
          progressionUpdates: progressionUpdates.map(({ exerciseEntry, progressionResult }) =>
            mapProgressionUpdateDto({
              exerciseId: exerciseEntry.exerciseId,
              exerciseName: exerciseEntry.exerciseNameSnapshot,
              previousWeightLbs: progressionResult.previousWeightLbs,
              nextWeightLbs: progressionResult.nextWeightLbs,
              result: progressionResult.result,
              reason: progressionResult.reason
            })
          ),
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
