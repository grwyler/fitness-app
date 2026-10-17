import type { StartWorkoutSessionRequest, WorkoutSessionDto } from "@fitness/shared";
import {
  CUSTOM_WORKOUT_TEMPLATE_ID,
  isCustomWorkoutTemplateId
} from "../../domain/models/custom-workout.js";
import { WorkoutSessionFactory } from "../../domain/services/workout-session-factory.js";
import { ProgressionEngine } from "../../domain/services/progression-engine.js";
import { resolveExerciseProgrammingProfile } from "../../domain/services/exercise-programming-profile.js";
import type { GeneratedSetTarget } from "../../domain/models/progression.js";
import type { EnrollmentRepository } from "../../repositories/interfaces/enrollment.repository.js";
import type { ExerciseRepository } from "../../repositories/interfaces/exercise.repository.js";
import type { IdempotencyRepository } from "../../repositories/interfaces/idempotency.repository.js";
import type { ProgressionStateRepository } from "../../repositories/interfaces/progression-state.repository.js";
import type { ProgressionStateV2Repository } from "../../repositories/interfaces/progression-state-v2.repository.js";
import type { WorkoutSessionRepository } from "../../repositories/interfaces/workout-session.repository.js";
import { mapWorkoutSessionDto } from "../mappers/workout-dto.mapper.js";
import { WorkoutApplicationError } from "../errors/workout-application.error.js";
import { IdempotencyService } from "../services/idempotency.service.js";
import type { TransactionManager } from "../services/transaction-manager.js";
import type { RequestContext } from "../types/request-context.js";
import type { UseCaseResult } from "../types/use-case-result.js";

function buildStartWorkoutFingerprint(request: StartWorkoutSessionRequest) {
  return JSON.stringify({
    sessionType: request.sessionType ?? "program",
    workoutTemplateId: request.workoutTemplateId ?? null,
    startedAt: request.startedAt ?? null
  });
}

export class StartWorkoutSessionUseCase {
  private readonly idempotencyService: IdempotencyService;
  private readonly workoutSessionFactory = new WorkoutSessionFactory();
  private readonly progressionEngine = new ProgressionEngine();

  public constructor(
    private readonly workoutSessionRepository: WorkoutSessionRepository,
    private readonly enrollmentRepository: EnrollmentRepository,
    private readonly progressionStateRepository: ProgressionStateRepository,
    private readonly progressionStateV2Repository: ProgressionStateV2Repository,
    private readonly exerciseRepository: ExerciseRepository,
    private readonly transactionManager: TransactionManager,
    idempotencyRepository: IdempotencyRepository
  ) {
    this.idempotencyService = new IdempotencyService(idempotencyRepository);
  }

  public async execute(input: {
    context: RequestContext;
    request: StartWorkoutSessionRequest;
    idempotencyKey: string;
  }): Promise<UseCaseResult<WorkoutSessionDto>> {
    const idempotentResult = await this.idempotencyService.execute({
      key: input.idempotencyKey,
      userId: input.context.userId,
      routeFamily: "start_workout_session",
      targetResourceId: null,
      requestFingerprint: buildStartWorkoutFingerprint(input.request),
      transactionManager: this.transactionManager,
      execute: async (tx) => {
        const existingSession = await this.workoutSessionRepository.findInProgressByUserId(
          input.context.userId,
          { tx }
        );
        if (existingSession) {
          throw new WorkoutApplicationError(
            "ACTIVE_WORKOUT_ALREADY_EXISTS",
            "The user already has an in-progress workout session."
          );
        }

        const isCustomWorkoutRequest =
          input.request.sessionType === "custom" ||
          (input.request.workoutTemplateId
            ? isCustomWorkoutTemplateId(input.request.workoutTemplateId)
            : false);

        const activeEnrollment = isCustomWorkoutRequest
          ? null
          : await this.enrollmentRepository.findActiveByUserId(input.context.userId, {
              tx
            });
        if (!isCustomWorkoutRequest && !activeEnrollment) {
          throw new WorkoutApplicationError(
            "ACTIVE_ENROLLMENT_NOT_FOUND",
            "The user does not have an active enrollment."
          );
        }

        const targetTemplateId = isCustomWorkoutRequest
          ? CUSTOM_WORKOUT_TEMPLATE_ID
          : input.request.workoutTemplateId ?? activeEnrollment?.currentWorkoutTemplateId;
        if (!targetTemplateId) {
          throw new WorkoutApplicationError(
            "WORKOUT_TEMPLATE_NOT_FOUND",
            "The active enrollment does not have a next workout template."
          );
        }

        const workoutTemplateDefinition = await this.exerciseRepository.findTemplateDefinitionById(
          targetTemplateId,
          { tx }
        );
        if (!workoutTemplateDefinition) {
          throw new WorkoutApplicationError(
            "WORKOUT_TEMPLATE_NOT_FOUND",
            "The requested workout template could not be found."
          );
        }
        if (
          !isCustomWorkoutRequest &&
          workoutTemplateDefinition.template.programId !== activeEnrollment?.programId
        ) {
          throw new WorkoutApplicationError(
            "WORKOUT_TEMPLATE_NOT_FOUND",
            "The requested workout template is not part of the active program."
          );
        }

        const templateExercises = workoutTemplateDefinition.exercises.map(({ exercise, templateExercise }) => {
          const profile = resolveExerciseProgrammingProfile({
            category: exercise.category,
            movementPattern: exercise.movementPattern,
            equipmentType: exercise.equipmentType,
            primaryMuscleGroup: exercise.primaryMuscleGroup
          });
          const repRangeMin = templateExercise.repRangeMin ?? profile.repRangeMin;
          const repRangeMax = templateExercise.repRangeMax ?? profile.repRangeMax;

          return {
            exerciseId: exercise.id,
            isProgressionEligible: exercise.isProgressionEligible,
            loggingModality: exercise.loggingModality,
            templateExerciseEntryId: templateExercise.id,
            templateTargetReps: templateExercise.targetReps,
            templateRepRangeMin: repRangeMin,
            templateRepRangeMax: repRangeMax
          };
        });

        const exerciseIds = templateExercises.map((row) => row.exerciseId);
        const uniqueExerciseIds = [...new Set(exerciseIds)];
        const progressionSeeds = await this.exerciseRepository.findProgressionSeedsByExerciseIds(
          uniqueExerciseIds,
          { tx }
        );

        if (progressionSeeds.length !== uniqueExerciseIds.length) {
          throw new WorkoutApplicationError(
            "PROGRESSION_SEED_NOT_FOUND",
            "One or more exercise progression seeds could not be found."
          );
        }

        const existingProgressionStates = await this.progressionStateRepository.findByUserIdAndExerciseIds(
          input.context.userId,
          uniqueExerciseIds,
          { tx }
        );

        const existingProgressionStateByExerciseId = new Set(
          existingProgressionStates.map((progressionState) => progressionState.exerciseId)
        );

        const missingProgressionStateInputs = progressionSeeds
          .filter((progressionSeed) => !existingProgressionStateByExerciseId.has(progressionSeed.exerciseId))
          .map((progressionSeed) => ({
            userId: input.context.userId,
            exerciseId: progressionSeed.exerciseId,
            currentWeightLbs: progressionSeed.defaultStartingWeightLbs,
            lastCompletedWeightLbs: null,
            consecutiveFailures: 0,
            lastEffortFeedback: null,
            lastPerformedAt: null
          }));

        const createdProgressionStates =
          missingProgressionStateInputs.length > 0
            ? await this.progressionStateRepository.createMany(missingProgressionStateInputs, { tx })
            : [];

        const progressionStates = [...existingProgressionStates, ...createdProgressionStates];
        const progressionStateByExerciseId = new Map(
          progressionStates.map((progressionState) => [progressionState.exerciseId, progressionState])
        );
        const progressionSeedByExerciseId = new Map(
          progressionSeeds.map((progressionSeed) => [progressionSeed.exerciseId, progressionSeed])
        );

        const progressionEligibleTemplateExercises = templateExercises.filter((row) => {
          if (!row.isProgressionEligible) {
            return false;
          }

          if (row.loggingModality !== "reps_load" && row.loggingModality !== "reps_only") {
            return false;
          }

          if (typeof row.templateRepRangeMin !== "number" || typeof row.templateRepRangeMax !== "number") {
            return false;
          }

          return row.templateRepRangeMin > 0 && row.templateRepRangeMax >= row.templateRepRangeMin;
        });

        const templateEntryIds = progressionEligibleTemplateExercises.map((row) => row.templateExerciseEntryId);
        const existingV2States = await this.progressionStateV2Repository.findByUserIdAndTemplateEntryIds(
          input.context.userId,
          templateEntryIds,
          { tx }
        );

        const v2StateByTemplateEntryId = new Map(
          existingV2States.map((state) => [state.workoutTemplateExerciseEntryId, state])
        );

        const rangeUpdateInputs = progressionEligibleTemplateExercises
          .map((row) => {
            const existing = v2StateByTemplateEntryId.get(row.templateExerciseEntryId);
            if (!existing) {
              return null;
            }

            const nextRepRangeMin = row.templateRepRangeMin!;
            const nextRepRangeMax = row.templateRepRangeMax!;
            const nextRepGoal = Math.min(nextRepRangeMax, Math.max(nextRepRangeMin, existing.repGoal));

            const needsUpdate =
              existing.repRangeMin !== nextRepRangeMin ||
              existing.repRangeMax !== nextRepRangeMax ||
              existing.repGoal !== nextRepGoal;

            return needsUpdate
              ? {
                  userId: existing.userId,
                  workoutTemplateExerciseEntryId: existing.workoutTemplateExerciseEntryId,
                  currentWeightLbs: existing.currentWeightLbs,
                  lastCompletedWeightLbs: existing.lastCompletedWeightLbs,
                  repGoal: nextRepGoal,
                  repRangeMin: nextRepRangeMin,
                  repRangeMax: nextRepRangeMax,
                  consecutiveFailures: existing.consecutiveFailures,
                  lastEffortFeedback: existing.lastEffortFeedback,
                  lastPerformedAt: existing.lastPerformedAt
                }
              : null;
          })
          .filter((value): value is NonNullable<typeof value> => value !== null);

        const updatedV2States =
          rangeUpdateInputs.length > 0
            ? await this.progressionStateV2Repository.updateMany(rangeUpdateInputs, { tx })
            : [];

        for (const updated of updatedV2States) {
          v2StateByTemplateEntryId.set(updated.workoutTemplateExerciseEntryId, updated);
        }

        const historyEntries = await Promise.all(
          workoutTemplateDefinition.exercises.map(async ({ exercise, templateExercise }) => [
            templateExercise.id,
            this.workoutSessionRepository.findMostRecentComparableExerciseHistory
              ? await this.workoutSessionRepository.findMostRecentComparableExerciseHistory(
                  {
                    userId: input.context.userId,
                    exerciseId: exercise.id,
                    workoutTemplateExerciseEntryId: templateExercise.id,
                    setScheme: templateExercise.setScheme ?? "straight",
                    targetSets: templateExercise.targetSets
                  },
                  { tx }
                )
              : null
          ] as const)
        );
        const historyByTemplateEntryId = new Map(historyEntries);

        const missingV2Inputs = progressionEligibleTemplateExercises
          .filter((row) => !v2StateByTemplateEntryId.has(row.templateExerciseEntryId))
          .map((row) => {
            const v1State = progressionStateByExerciseId.get(row.exerciseId) ?? null;
            const progressionSeed = progressionSeedByExerciseId.get(row.exerciseId);
            if (!progressionSeed) {
              throw new WorkoutApplicationError(
                "PROGRESSION_SEED_NOT_FOUND",
                `Progression seed not found for exercise ${row.exerciseId}.`
              );
            }

            const repRangeMin = row.templateRepRangeMin!;
            const repRangeMax = row.templateRepRangeMax!;
            const repGoal = Math.max(repRangeMin, Math.min(repRangeMax, row.templateTargetReps ?? repRangeMin));

            return {
              userId: input.context.userId,
              workoutTemplateExerciseEntryId: row.templateExerciseEntryId,
              // History is passed to generatePrescription below. State creation
              // only supplies a neutral migration seed; it must not make its
              // own target choice from a historical set.
              currentWeightLbs: v1State?.currentWeightLbs ?? progressionSeed.defaultStartingWeightLbs,
              lastCompletedWeightLbs: v1State?.lastCompletedWeightLbs ?? null,
              repGoal,
              repRangeMin,
              repRangeMax,
              consecutiveFailures: v1State?.consecutiveFailures ?? 0,
              lastEffortFeedback: v1State?.lastEffortFeedback ?? null,
              // A v1 timestamp is exercise-global and may belong to an
              // incompatible plan entry or scheme. Let the canonical engine
              // compare compatible history before treating this migrated value
              // as a current plan-scoped progression decision.
              lastPerformedAt: null
            };
          });

        const createdV2States =
          missingV2Inputs.length > 0
            ? await this.progressionStateV2Repository.createMany(missingV2Inputs, { tx })
            : [];

        for (const created of createdV2States) {
          v2StateByTemplateEntryId.set(created.workoutTemplateExerciseEntryId, created);
        }

        const prescribedTargetsByTemplateEntryId = new Map<string, GeneratedSetTarget[]>();
        for (const { exercise, templateExercise } of workoutTemplateDefinition.exercises) {
          if (!exercise.isProgressionEligible || (exercise.loggingModality !== "reps_load" && exercise.loggingModality !== "reps_only")) continue;
          const state = v2StateByTemplateEntryId.get(templateExercise.id);
          if (!state) continue;
          prescribedTargetsByTemplateEntryId.set(templateExercise.id, this.progressionEngine.generatePrescription({
            state,
            exercise: {
              exerciseName: exercise.name,
              exerciseCategory: exercise.category,
              incrementLbs: exercise.defaultIncrementLbs,
              isBodyweight: exercise.isBodyweight,
              isWeightOptional: exercise.isWeightOptional,
              loadType: "external"
            },
            loggingModality: exercise.loggingModality as "reps_load" | "reps_only",
            strategy: templateExercise.progressionStrategy ?? "double_progression",
            setScheme: templateExercise.setScheme ?? "straight",
            targetSets: templateExercise.targetSets,
            planTargetWeightLbs: templateExercise.targetWeightLbs ?? null,
            defaultStartingWeightLbs: exercise.defaultStartingWeightLbs,
            explicitTargets: templateExercise.setTargets ?? null,
            history: historyByTemplateEntryId.get(templateExercise.id) ?? null,
            performedAt: input.request.startedAt ? new Date(input.request.startedAt) : new Date()
          }));
        }

        const workoutSessionGraphInput = this.workoutSessionFactory.build({
          userId: input.context.userId,
          programId: workoutTemplateDefinition.template.programId,
          programName: workoutTemplateDefinition.template.programName,
          workoutTemplateDefinition,
          progressionStatesV2: [...v2StateByTemplateEntryId.values()],
          prescribedTargetsByTemplateEntryId,
          startedAt: input.request.startedAt ? new Date(input.request.startedAt) : new Date()
        });

        const createdWorkoutSessionGraph = await this.workoutSessionRepository.createSessionGraph(
          workoutSessionGraphInput,
          { tx }
        );

        return mapWorkoutSessionDto(createdWorkoutSessionGraph);
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
