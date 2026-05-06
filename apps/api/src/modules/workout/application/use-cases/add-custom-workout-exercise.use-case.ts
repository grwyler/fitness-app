import { generateCustomWorkoutNameFromExercises, type AddCustomWorkoutExerciseRequest, type WorkoutSessionDto } from "@fitness/shared";
import { CUSTOM_WORKOUT_TEMPLATE_NAME, isCustomWorkoutProgramId } from "../../domain/models/custom-workout.js";
import type { ProgramRepository } from "../../repositories/interfaces/program.repository.js";
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
    targetReps: request.targetReps ?? null,
    repRangeMin: request.repRangeMin ?? null,
    repRangeMax: request.repRangeMax ?? null,
    targetWeight: request.targetWeight?.value ?? null,
    targetDurationSeconds: request.targetDurationSeconds ?? null,
    targetDistanceMeters: request.targetDistanceMeters ?? null,
    targetRounds: request.targetRounds ?? null,
    restSeconds: request.restSeconds ?? null,
    progressionStrategy: request.progressionStrategy ?? null,
    updatePlan: request.updatePlan ?? false
  });
}

export class AddCustomWorkoutExerciseUseCase {
  private readonly idempotencyService: IdempotencyService;

  public constructor(
    private readonly workoutSessionRepository: WorkoutSessionRepository,
    private readonly progressionStateRepository: ProgressionStateRepository,
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

        const exercise = (await this.exerciseRepository.findByIds([input.request.exerciseId], { tx }))[0];
        if (!exercise || !exercise.isActive) {
          throw new WorkoutApplicationError("EXERCISE_NOT_FOUND", "The selected exercise could not be found.");
        }

        const shouldUseProgression =
          exercise.isProgressionEligible &&
          (exercise.loggingModality === "reps_load" || exercise.loggingModality === "reps_only");

        const targetReps = input.request.targetReps ?? null;
        if (shouldUseProgression && targetReps === null) {
          throw new WorkoutApplicationError(
            "VALIDATION_ERROR",
            "targetReps is required for this exercise."
          );
        }

        const progressionSeed = shouldUseProgression
          ? (await this.exerciseRepository.findProgressionSeedsByExerciseIds([exercise.id], { tx }))[0] ?? null
          : null;
        if (shouldUseProgression && !progressionSeed) {
          throw new WorkoutApplicationError(
            "PROGRESSION_SEED_NOT_FOUND",
            "Progression defaults could not be loaded for the selected exercise."
          );
        }

        let progressionState = shouldUseProgression
          ? (
              await this.progressionStateRepository.findByUserIdAndExerciseIds(
                input.context.userId,
                [exercise.id],
                { tx }
              )
            )[0] ?? null
          : null;

        if (shouldUseProgression && !progressionState) {
          progressionState =
            (
              await this.progressionStateRepository.createMany(
                [
                  {
                    userId: input.context.userId,
                    exerciseId: exercise.id,
                    currentWeightLbs: progressionSeed!.defaultStartingWeightLbs,
                    lastCompletedWeightLbs: null,
                    consecutiveFailures: 0,
                    lastEffortFeedback: null,
                    lastPerformedAt: null
                  }
                ],
                { tx }
              )
            )[0] ?? null;
        }

        if (shouldUseProgression && !progressionState) {
          throw new WorkoutApplicationError(
            "PROGRESSION_STATE_NOT_FOUND",
            "A progression state could not be created for the selected exercise."
          );
        }

        const targetWeightLbs = shouldUseProgression
          ? (input.request.targetWeight?.value ?? progressionState!.currentWeightLbs)
          : (input.request.targetWeight?.value ?? null);

        if (shouldUseProgression && input.request.targetWeight?.value !== undefined && progressionSeed!.isProgressionEligible) {
          await this.progressionStateRepository.updateMany(
            [
              {
                userId: input.context.userId,
                exerciseId: exercise.id,
                currentWeightLbs: targetWeightLbs ?? progressionState!.currentWeightLbs,
                lastCompletedWeightLbs: progressionState!.lastCompletedWeightLbs,
                consecutiveFailures: progressionState!.consecutiveFailures,
                lastEffortFeedback: progressionState!.lastEffortFeedback,
                lastPerformedAt: progressionState!.lastPerformedAt
              }
            ],
            { tx }
          );
        }

        const nextSequenceOrder =
          workoutSessionGraph.exerciseEntries.reduce(
            (maxSequenceOrder, exerciseEntry) => Math.max(maxSequenceOrder, exerciseEntry.sequenceOrder),
            0
          ) + 1;

        const wantsPlanUpdate = Boolean(input.request.updatePlan);
        const canUpdatePlan = await (async () => {
          if (!wantsPlanUpdate) {
            return false;
          }

          if (isCustomWorkoutProgramId(workoutSessionGraph.session.programId)) {
            throw new WorkoutApplicationError(
              "BUSINESS_RULE_VIOLATION",
              "The plan cannot be updated for ad hoc custom workouts."
            );
          }

          const definition = await this.programRepository.findActiveById(
            workoutSessionGraph.session.programId,
            input.context.userId,
            { tx }
          );
          if (!definition) {
            throw new WorkoutApplicationError("PROGRAM_NOT_FOUND", "The requested program could not be found.");
          }

          if (definition.program.userId !== input.context.userId || definition.program.source !== "custom") {
            throw new WorkoutApplicationError(
              "BUSINESS_RULE_VIOLATION",
              "The plan can only be updated for your custom programs."
            );
          }

          return true;
        })();

        const workoutTemplateExerciseEntryId = canUpdatePlan
          ? await (async () => {
              const templateDefinition = await this.exerciseRepository.findTemplateDefinitionById(
                workoutSessionGraph.session.workoutTemplateId,
                { tx }
              );
              if (!templateDefinition) {
                throw new WorkoutApplicationError(
                  "WORKOUT_TEMPLATE_NOT_FOUND",
                  "The workout template could not be loaded to update the plan."
                );
              }

              const nextTemplateSequenceOrder =
                templateDefinition.exercises.reduce(
                  (maxSequenceOrder, record) => Math.max(maxSequenceOrder, record.templateExercise.sequenceOrder),
                  0
                ) + 1;

              return this.exerciseRepository.appendWorkoutTemplateExerciseEntry(
                {
                  workoutTemplateId: workoutSessionGraph.session.workoutTemplateId,
                  exerciseId: exercise.id,
                  sequenceOrder: nextTemplateSequenceOrder,
                  targetSets: input.request.targetSets,
                  targetReps,
                  ...(input.request.targetDurationSeconds !== undefined
                    ? { targetDurationSeconds: input.request.targetDurationSeconds ?? null }
                    : {}),
                  ...(input.request.targetDistanceMeters !== undefined
                    ? { targetDistanceMeters: input.request.targetDistanceMeters ?? null }
                    : {}),
                  ...(input.request.targetRounds !== undefined
                    ? { targetRounds: input.request.targetRounds ?? null }
                    : {}),
                  restSeconds: input.request.restSeconds ?? null,
                  ...(input.request.repRangeMin !== undefined
                    ? { repRangeMin: input.request.repRangeMin }
                    : {}),
                  ...(input.request.repRangeMax !== undefined
                    ? { repRangeMax: input.request.repRangeMax }
                    : {}),
                  ...(input.request.progressionStrategy !== undefined
                    ? { progressionStrategy: input.request.progressionStrategy }
                    : {})
                },
                { tx }
              );
            })()
          : null;

        const updatedGraph = await this.workoutSessionRepository.appendCustomExercise(
          {
            sessionId: workoutSessionGraph.session.id,
            exerciseEntry: {
              exerciseId: exercise.id,
              workoutTemplateExerciseEntryId,
              sequenceOrder: nextSequenceOrder,
              targetSets: input.request.targetSets,
              targetReps,
              targetWeightLbs,
              targetDurationSeconds: input.request.targetDurationSeconds ?? null,
              targetDistanceMeters: input.request.targetDistanceMeters ?? null,
              targetRounds: input.request.targetRounds ?? null,
              restSeconds: input.request.restSeconds ?? null,
              effortFeedback: null,
              completedAt: null,
              exerciseNameSnapshot: exercise.name,
              exerciseCategorySnapshot: exercise.category,
              loggingModalitySnapshot: exercise.loggingModality,
              progressionRuleSnapshot: {
                incrementLbs: exercise.defaultIncrementLbs
              }
            },
            sets: Array.from({ length: input.request.targetSets }, (_, index) => ({
              setNumber: index + 1,
              setType: "working",
              targetReps,
              actualReps: null,
              targetWeightLbs,
              actualWeightLbs: null,
              targetDurationSeconds: input.request.targetDurationSeconds ?? null,
              actualDurationSeconds: null,
              targetDistanceMeters: input.request.targetDistanceMeters ?? null,
              actualDistanceMeters: null,
              targetRounds: input.request.targetRounds ?? null,
              actualRounds: null,
              status: "pending",
              rir: null,
              failureStatus: null,
              completedAt: null
            }))
          },
          { tx }
        );

        if (workoutSessionGraph.session.workoutNameSnapshot === CUSTOM_WORKOUT_TEMPLATE_NAME) {
          const allExerciseIds = Array.from(
            new Set(updatedGraph.exerciseEntries.map((entry) => entry.exerciseId))
          );
          const exerciseRecords = await this.exerciseRepository.findByIds(allExerciseIds, { tx });
          const generatedName = generateCustomWorkoutNameFromExercises(
            exerciseRecords.map((record) => ({
              name: record.name,
              primaryMuscleGroup: record.primaryMuscleGroup,
              movementPattern: record.movementPattern,
              category: record.category
            }))
          );

          if (generatedName) {
            await this.workoutSessionRepository.updateWorkoutNameSnapshotIfDefault(
              {
                sessionId: workoutSessionGraph.session.id,
                workoutNameSnapshot: generatedName,
                expectedCurrentName: CUSTOM_WORKOUT_TEMPLATE_NAME
              },
              { tx }
            );
          }
        }

        const refreshedGraph =
          workoutSessionGraph.session.workoutNameSnapshot === CUSTOM_WORKOUT_TEMPLATE_NAME
            ? await this.workoutSessionRepository.findOwnedSessionGraphById(
                input.context.userId,
                workoutSessionGraph.session.id,
                { tx }
              )
            : updatedGraph;

        return mapWorkoutSessionDto(refreshedGraph ?? updatedGraph);
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
