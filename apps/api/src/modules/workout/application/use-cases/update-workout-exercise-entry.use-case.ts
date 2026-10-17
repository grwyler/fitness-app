import type { UpdateWorkoutExerciseEntryRequest, WorkoutSessionDto } from "@fitness/shared";
import { isCustomWorkoutProgramId } from "../../domain/models/custom-workout.js";
import { ProgressionEngine } from "../../domain/services/progression-engine.js";
import type { ExerciseRepository } from "../../repositories/interfaces/exercise.repository.js";
import type { IdempotencyRepository } from "../../repositories/interfaces/idempotency.repository.js";
import type { ProgramRepository } from "../../repositories/interfaces/program.repository.js";
import type { ProgressionStateV2Repository } from "../../repositories/interfaces/progression-state-v2.repository.js";
import type { WorkoutSessionRepository } from "../../repositories/interfaces/workout-session.repository.js";
import { WorkoutApplicationError } from "../errors/workout-application.error.js";
import { mapWorkoutSessionDto } from "../mappers/workout-dto.mapper.js";
import { IdempotencyService } from "../services/idempotency.service.js";
import type { TransactionManager } from "../services/transaction-manager.js";
import type { RequestContext } from "../types/request-context.js";
import type { UseCaseResult } from "../types/use-case-result.js";

function buildUpdateWorkoutExerciseEntryFingerprint(input: {
  sessionId: string;
  exerciseEntryId: string;
  request: UpdateWorkoutExerciseEntryRequest;
}) {
  return JSON.stringify({
    sessionId: input.sessionId,
    exerciseEntryId: input.exerciseEntryId,
    targetSets: input.request.targetSets,
    targetReps: input.request.targetReps ?? undefined,
    targetWeight: input.request.targetWeight?.value ?? null,
    targetDurationSeconds: input.request.targetDurationSeconds ?? undefined,
    targetDistanceMeters: input.request.targetDistanceMeters ?? undefined,
    targetRounds: input.request.targetRounds ?? undefined,
    restSeconds: input.request.restSeconds ?? undefined,
    setScheme: input.request.setScheme ?? null,
    updatePlan: input.request.updatePlan ?? false
  });
}

export class UpdateWorkoutExerciseEntryUseCase {
  private readonly idempotencyService: IdempotencyService;
  private readonly progressionEngine = new ProgressionEngine();

  public constructor(
    private readonly workoutSessionRepository: WorkoutSessionRepository,
    private readonly exerciseRepository: ExerciseRepository,
    private readonly progressionStateV2Repository: ProgressionStateV2Repository,
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
    request: UpdateWorkoutExerciseEntryRequest;
    idempotencyKey: string;
  }): Promise<UseCaseResult<WorkoutSessionDto>> {
    const idempotentResult = await this.idempotencyService.execute({
      key: input.idempotencyKey,
      userId: input.context.userId,
      routeFamily: "update_workout_exercise_entry",
      targetResourceId: input.sessionId,
      requestFingerprint: buildUpdateWorkoutExerciseEntryFingerprint({
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
            "Exercises can only be edited in an in-progress workout session."
          );
        }

        const exerciseEntry = workoutSessionGraph.exerciseEntries.find((entry) => entry.id === input.exerciseEntryId) ?? null;
        if (!exerciseEntry) {
          throw new WorkoutApplicationError("EXERCISE_ENTRY_NOT_FOUND", "The exercise entry could not be found.");
        }

        const targetReps =
          input.request.targetReps !== undefined ? (input.request.targetReps ?? null) : (exerciseEntry.targetReps ?? null);
        const targetWeightLbs =
          input.request.targetWeight !== undefined
            ? input.request.targetWeight?.value ?? null
            : (exerciseEntry.targetWeightLbs ?? null);
        const targetDurationSeconds =
          input.request.targetDurationSeconds !== undefined
            ? input.request.targetDurationSeconds ?? null
            : (exerciseEntry.targetDurationSeconds ?? null);
        const targetDistanceMeters =
          input.request.targetDistanceMeters !== undefined
            ? input.request.targetDistanceMeters ?? null
            : (exerciseEntry.targetDistanceMeters ?? null);
        const targetRounds =
          input.request.targetRounds !== undefined ? input.request.targetRounds ?? null : (exerciseEntry.targetRounds ?? null);
        const restSeconds =
          input.request.restSeconds !== undefined ? input.request.restSeconds ?? null : (exerciseEntry.restSeconds ?? null);
        const setScheme = input.request.setScheme ?? (exerciseEntry.progressionRuleSnapshot?.setScheme as import("@fitness/shared").ExerciseSetScheme | undefined) ?? "straight";
        const exerciseModel = (await this.exerciseRepository.findByIds([exerciseEntry.exerciseId], { tx }))[0] ?? null;
        const incrementLbs = exerciseModel?.defaultIncrementLbs ?? 5;
        const rangeMin = exerciseEntry.repRangeMin ?? targetReps ?? 1;
        const rangeMax = exerciseEntry.repRangeMax ?? targetReps ?? Math.max(12, rangeMin);
        const manualPrescription = this.progressionEngine.generatePrescription({
          state: {
            id: `manual-${exerciseEntry.id}`,
            userId: input.context.userId,
            workoutTemplateExerciseEntryId: exerciseEntry.workoutTemplateExerciseEntryId ?? exerciseEntry.id,
            currentWeightLbs: targetWeightLbs ?? (exerciseModel?.isBodyweight || exerciseModel?.isWeightOptional ? 0 : exerciseModel?.defaultStartingWeightLbs ?? 0),
            lastCompletedWeightLbs: null,
            repGoal: targetReps ?? rangeMin,
            repRangeMin: rangeMin,
            repRangeMax: rangeMax,
            consecutiveFailures: 0,
            lastEffortFeedback: null,
            lastPerformedAt: null,
            createdAt: new Date(),
            updatedAt: new Date()
          },
          exercise: {
            exerciseName: exerciseEntry.exerciseNameSnapshot,
            exerciseCategory: exerciseEntry.exerciseCategorySnapshot,
            incrementLbs,
            isBodyweight: exerciseModel?.isBodyweight ?? false,
            isWeightOptional: exerciseModel?.isWeightOptional ?? false,
            loadType: "external"
          },
          loggingModality: exerciseEntry.loggingModalitySnapshot === "reps_only" ? "reps_only" : "reps_load",
          strategy: (exerciseEntry.progressionRuleSnapshot?.progressionStrategy as import("@fitness/shared").ProgressionStrategy | undefined) ?? "double_progression",
          setScheme,
          targetSets: input.request.targetSets,
          planTargetWeightLbs: targetWeightLbs,
          ...(exerciseModel ? { defaultStartingWeightLbs: exerciseModel.defaultStartingWeightLbs } : {})
        });

        const updatedGraph = await this.workoutSessionRepository.updateWorkoutExerciseEntry(
          {
            exerciseEntryId: exerciseEntry.id,
            targetSets: input.request.targetSets,
            targetReps,
            targetWeightLbs,
            targetDurationSeconds,
            targetDistanceMeters,
            targetRounds,
            restSeconds,
            setScheme,
            setTargets: manualPrescription.map(({ setNumber, targetReps, targetWeightLbs, repTargetText, tiers }) => ({ setNumber, targetReps, targetWeightLbs, repTargetText, tiers })),
            manualTargetOverride:
              input.request.targetReps !== undefined || input.request.targetWeight !== undefined || input.request.setScheme !== undefined
          },
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

          await this.exerciseRepository.updateWorkoutTemplateExerciseEntry(
            {
              workoutTemplateExerciseEntryId: templateEntryId,
              targetSets: input.request.targetSets,
              targetReps,
              targetWeightLbs,
              targetDurationSeconds,
              targetDistanceMeters,
              targetRounds,
              restSeconds,
              setScheme
            },
            { tx }
          );

          const exercise = (await this.exerciseRepository.findByIds([exerciseEntry.exerciseId], { tx }))[0] ?? null;
          const shouldUseProgression =
            Boolean(exercise?.isProgressionEligible) &&
            (exerciseEntry.loggingModalitySnapshot === "reps_load" || exerciseEntry.loggingModalitySnapshot === "reps_only");

          if (shouldUseProgression) {
            if (targetReps === null) {
              throw new WorkoutApplicationError("VALIDATION_ERROR", "targetReps is required for this exercise.");
            }

            const [existingV2] = await this.progressionStateV2Repository.findByUserIdAndTemplateEntryIds(
              input.context.userId,
              [templateEntryId],
              { tx }
            );

            if (existingV2) {
              if (targetReps < existingV2.repRangeMin || targetReps > existingV2.repRangeMax) {
                throw new WorkoutApplicationError(
                  "VALIDATION_ERROR",
                  `targetReps must be within your rep range (${existingV2.repRangeMin}-${existingV2.repRangeMax}) to update the plan.`
                );
              }

              await this.progressionStateV2Repository.updateMany(
                [
                  {
                    userId: existingV2.userId,
                    workoutTemplateExerciseEntryId: existingV2.workoutTemplateExerciseEntryId,
                    currentWeightLbs: targetWeightLbs ?? existingV2.currentWeightLbs,
                    lastCompletedWeightLbs: existingV2.lastCompletedWeightLbs,
                    repGoal: targetReps,
                    repRangeMin: existingV2.repRangeMin,
                    repRangeMax: existingV2.repRangeMax,
                    consecutiveFailures: existingV2.consecutiveFailures,
                    lastEffortFeedback: existingV2.lastEffortFeedback,
                    lastPerformedAt: existingV2.lastPerformedAt
                  }
                ],
                { tx }
              );
            }
          }
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

