import type {
  CompleteWorkoutSessionRequest,
  CompleteWorkoutSessionResponse,
  EffortFeedback,
  ProgressionUpdateDto,
  ProgressionStrategy,
  TrainingGoal,
  ExperienceLevel
} from "@fitness/shared";
import { progressionStrategies } from "@fitness/shared";
import { isCustomWorkoutProgramId } from "../../domain/models/custom-workout.js";
import { ProgramAdvancementPolicy } from "../../domain/services/program-advancement-policy.js";
import { ProgressionEngine } from "../../domain/services/progression-engine.js";
import { WorkoutValidationService } from "../../domain/services/workout-validation-service.js";
import type { EnrollmentRepository } from "../../repositories/interfaces/enrollment.repository.js";
import type { ExerciseRepository } from "../../repositories/interfaces/exercise.repository.js";
import type { IdempotencyRepository } from "../../repositories/interfaces/idempotency.repository.js";
import type { ProgramRepository } from "../../repositories/interfaces/program.repository.js";
import type { ProgressMetricRepository } from "../../repositories/interfaces/progress-metric.repository.js";
import type { ProgressionStateRepository } from "../../repositories/interfaces/progression-state.repository.js";
import type { ProgressionStateV2Repository } from "../../repositories/interfaces/progression-state-v2.repository.js";
import type { WorkoutSessionRepository } from "../../repositories/interfaces/workout-session.repository.js";
import type { UserRepository } from "../../repositories/interfaces/user.repository.js";
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
import type { ProgressionRecommendationEventRepository } from "../../repositories/interfaces/progression-recommendation-event.repository.js";
import type { CreateProgressionRecommendationEventInput } from "../../repositories/models/progression-recommendation-event.persistence.js";

function daysSince(previous: Date, current: Date) {
  const ms = current.getTime() - previous.getTime();
  return Math.floor(ms / 86_400_000);
}

function buildProgressionExplanation(input: {
  result: ProgressionUpdateDto["result"];
  reason: string;
  previousWeightLbs: number;
  nextWeightLbs: number;
  previousRepGoal: number;
  nextRepGoal: number;
  effortFeedback: EffortFeedback | null;
  workoutIsPartial: boolean;
  totalSetCount: number;
  loggedSetCount: number;
  hasFailedSets: boolean;
  missingActualWeight: boolean;
  lastPerformedAt: Date | null;
  performedAt: Date | null;
  trainingGoal: TrainingGoal;
  goalSource: "user" | "program" | "default";
  experienceLevel: ExperienceLevel | null;
}) {
  const reasonCodes: string[] = [];
  const evidence: string[] = [];

  if (input.totalSetCount > 0) {
    evidence.push(`Completed ${input.loggedSetCount}/${input.totalSetCount} sets`);
    if (input.loggedSetCount === input.totalSetCount && input.hasFailedSets) {
      evidence.push("At least one set was missed");
      reasonCodes.push("HAS_FAILURE");
    } else if (input.loggedSetCount === input.totalSetCount) {
      reasonCodes.push("ALL_SETS_COMPLETED");
    }
  }

  if (input.effortFeedback) {
    reasonCodes.push(
      input.effortFeedback === "too_easy"
        ? "EFFORT_TOO_EASY"
        : input.effortFeedback === "too_hard"
          ? "EFFORT_TOO_HARD"
          : "EFFORT_JUST_RIGHT"
    );
    evidence.push(
      input.effortFeedback === "too_easy"
        ? "Effort marked too easy"
        : input.effortFeedback === "too_hard"
          ? "Effort marked too hard"
          : "Effort marked just right"
    );
  } else {
    reasonCodes.push("EFFORT_MISSING");
    evidence.push("Effort feedback missing");
  }

  if (input.workoutIsPartial) {
    reasonCodes.push("WORKOUT_PARTIAL");
  }

  if (input.missingActualWeight) {
    reasonCodes.push("MISSING_ACTUAL_WEIGHT");
    evidence.push("Some logged sets were missing actual weight");
  } else if (input.loggedSetCount > 0) {
    evidence.push("Actual weights were logged");
  }

  if (input.lastPerformedAt && input.performedAt) {
    const gapDays = daysSince(input.lastPerformedAt, input.performedAt);
    evidence.push(`Last trained ${gapDays} day${gapDays === 1 ? "" : "s"} ago`);
    if (gapDays >= 30) {
      reasonCodes.push("TIME_OFF_30_DAYS");
    } else if (gapDays >= 14) {
      reasonCodes.push("TIME_OFF_14_DAYS");
    } else {
      reasonCodes.push("RECENT_TRAINING_DATA");
    }
  } else {
    reasonCodes.push("HISTORY_LIMITED");
    evidence.push("No recent training history available");
  }

  if (input.goalSource !== "default") {
    reasonCodes.push(input.goalSource === "user" ? "GOAL_FROM_USER" : "GOAL_FROM_PROGRAM");
  }
  if (input.trainingGoal !== "general_fitness") {
    reasonCodes.push(`GOAL_${input.trainingGoal.toUpperCase()}`);
    evidence.push(`Training goal: ${input.trainingGoal}`);
  }
  if (input.experienceLevel === "intermediate" || input.experienceLevel === "advanced") {
    reasonCodes.push(`EXPERIENCE_${input.experienceLevel.toUpperCase()}`);
    evidence.push(`Experience level: ${input.experienceLevel}`);
  }

  switch (input.result) {
    case "increased": {
      if (input.nextWeightLbs > input.previousWeightLbs) {
        reasonCodes.push("WEIGHT_INCREASED");
        evidence.push(`Weight increased from ${input.previousWeightLbs} to ${input.nextWeightLbs}`);
      } else if (input.nextRepGoal > input.previousRepGoal) {
        reasonCodes.push("REP_GOAL_INCREASED");
        evidence.push(`Rep goal increased from ${input.previousRepGoal} to ${input.nextRepGoal}`);
      } else {
        reasonCodes.push("PROGRESSION_INCREASED");
      }
      break;
    }
    case "repeated": {
      reasonCodes.push("REPEATED");
      break;
    }
    case "reduced": {
      reasonCodes.push("WEIGHT_REDUCED");
      evidence.push(`Weight reduced from ${input.previousWeightLbs} to ${input.nextWeightLbs}`);
      if (input.nextRepGoal < input.previousRepGoal) {
        reasonCodes.push("REP_GOAL_RESET");
        evidence.push(`Rep goal reset from ${input.previousRepGoal} to ${input.nextRepGoal}`);
      }
      break;
    }
    case "recalibrated": {
      reasonCodes.push("RECALIBRATED");
      evidence.push(`Recalibrated weight to ${input.nextWeightLbs}`);
      break;
    }
    case "skipped": {
      reasonCodes.push("SKIPPED");
      break;
    }
  }

  const confidence: ProgressionUpdateDto["confidence"] = (() => {
    if (input.result === "skipped") {
      return "low";
    }
    if (input.workoutIsPartial) {
      return "low";
    }
    if (!input.effortFeedback) {
      return "low";
    }
    if (input.missingActualWeight) {
      return "low";
    }
    if (!input.lastPerformedAt || !input.performedAt) {
      return "medium";
    }

    const gapDays = daysSince(input.lastPerformedAt, input.performedAt);
    if (gapDays >= 14) {
      return "medium";
    }

    if (input.loggedSetCount > 0 && input.loggedSetCount === input.totalSetCount && !input.hasFailedSets) {
      return "high";
    }

    return "medium";
  })();

  return {
    confidence,
    reasonCodes: [...new Set(reasonCodes)],
    evidence
  };
}

function buildRecommendationEventInput(input: {
  userId: string;
  exerciseId: string | null;
  workoutTemplateExerciseEntryId: string | null;
  workoutSessionId: string;
  exerciseEntryId: string;
  previousWeightLbs: number;
  nextWeightLbs: number;
  previousRepGoal: number | null;
  nextRepGoal: number | null;
  result: ProgressionUpdateDto["result"];
  reason: string;
  confidence: ProgressionUpdateDto["confidence"];
  reasonCodes: string[];
  evidence: string[];
  inputSnapshot: Record<string, unknown>;
}): CreateProgressionRecommendationEventInput {
  return {
    userId: input.userId,
    exerciseId: input.exerciseId,
    workoutTemplateExerciseEntryId: input.workoutTemplateExerciseEntryId,
    workoutSessionId: input.workoutSessionId,
    exerciseEntryId: input.exerciseEntryId,
    previousWeightLbs: input.previousWeightLbs,
    nextWeightLbs: input.nextWeightLbs,
    previousRepGoal: input.previousRepGoal,
    nextRepGoal: input.nextRepGoal,
    result: input.result,
    reason: input.reason,
    confidence: input.confidence,
    reasonCodes: input.reasonCodes,
    evidence: input.evidence,
    inputSnapshot: input.inputSnapshot
  };
}

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
    private readonly userRepository: UserRepository,
    private readonly programRepository: ProgramRepository,
    private readonly progressMetricRepository: ProgressMetricRepository,
    private readonly progressionRecommendationEventRepository: ProgressionRecommendationEventRepository,
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

        const userTrainingProfile = await this.userRepository.findTrainingProfile(input.context.userId, { tx });
        const experienceLevel = userTrainingProfile?.experienceLevel ?? null;
        const userTrainingGoal = userTrainingProfile?.trainingGoal ?? null;

        const programDefinition = isCustomWorkout
          ? null
          : await this.programRepository.findActiveById(
              workoutSessionGraph.session.programId,
              input.context.userId,
              { tx }
            );
        const programTrainingGoal = programDefinition?.program.trainingGoal ?? null;

        const goalSource: "user" | "program" | "default" = userTrainingGoal
          ? "user"
          : programTrainingGoal
            ? "program"
            : "default";
        const trainingGoal: TrainingGoal = userTrainingGoal ?? programTrainingGoal ?? "general_fitness";
        const progressionGoal: TrainingGoal | null = goalSource === "default" ? null : trainingGoal;

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

        const progressionEligibleEntriesWithMaybeTemplateEntry = progressionEligibleExerciseEntries.map((entry) => ({
          entry,
          workoutTemplateExerciseEntryId:
            entry.workoutTemplateExerciseEntryId ??
            fallbackTemplateEntryIdBySequenceOrder.get(entry.sequenceOrder) ??
            null
        }));

        const progressionEligibleEntriesWithTemplateEntry = progressionEligibleEntriesWithMaybeTemplateEntry.filter(
          (row): row is { entry: typeof progressionEligibleExerciseEntries[number]; workoutTemplateExerciseEntryId: string } =>
            row.workoutTemplateExerciseEntryId !== null
        );

        const progressionEligibleEntriesWithoutTemplateEntry = progressionEligibleEntriesWithMaybeTemplateEntry
          .filter((row) => row.workoutTemplateExerciseEntryId === null)
          .map((row) => row.entry);

        const progressionStatesV1 = await this.progressionStateRepository.findByUserIdAndExerciseIds(
          input.context.userId,
          progressionEligibleExerciseEntries.map((exerciseEntry) => exerciseEntry.exerciseId),
          { tx }
        );
        const progressionStateV1ByExerciseId = new Map(
          progressionStatesV1.map((progressionState) => [progressionState.exerciseId, progressionState])
        );

        const missingV1ExerciseIds = [...new Set(progressionEligibleEntriesWithoutTemplateEntry.map((entry) => entry.exerciseId))].filter(
          (exerciseId) => !progressionStateV1ByExerciseId.has(exerciseId)
        );
        const createdV1States =
          missingV1ExerciseIds.length > 0
            ? await this.progressionStateRepository.createMany(
                missingV1ExerciseIds.map((exerciseId) => {
                  const progressionSeed = progressionSeedByExerciseId.get(exerciseId);
                  if (!progressionSeed) {
                    throw new WorkoutApplicationError(
                      "PROGRESSION_SEED_NOT_FOUND",
                      `Progression seed not found for exercise ${exerciseId}.`
                    );
                  }

                  return {
                    userId: input.context.userId,
                    exerciseId,
                    currentWeightLbs: progressionSeed.defaultStartingWeightLbs,
                    lastCompletedWeightLbs: null,
                    consecutiveFailures: 0,
                    lastEffortFeedback: null,
                    lastPerformedAt: null
                  };
                }),
                { tx }
              )
            : [];
        for (const created of createdV1States) {
          progressionStateV1ByExerciseId.set(created.exerciseId, created);
        }

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

        const computedProgressionUpdatesV2: Array<{
          exerciseEntry: typeof progressionEligibleExerciseEntries[number];
          workoutTemplateExerciseEntryId: string;
          progressionResult: ReturnType<ProgressionEngine["calculateDoubleProgression"]>;
          inputSnapshot: Record<string, unknown>;
        }> = [];
        const skippedProgressionUpdatesV2: Array<{
          exerciseEntry: typeof progressionEligibleExerciseEntries[number];
          workoutTemplateExerciseEntryId: string;
          reason: string;
          inputSnapshot: Record<string, unknown>;
        }> = [];

        for (const { entry, workoutTemplateExerciseEntryId } of progressionEligibleEntriesWithTemplateEntry) {
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

          const progressionStrategy: ProgressionStrategy = (() => {
            const raw = (exerciseEntry.progressionRuleSnapshot as Record<string, unknown> | null)?.[
              "progressionStrategy"
            ];
            if (typeof raw === "string" && (progressionStrategies as readonly string[]).includes(raw)) {
              return raw as ProgressionStrategy;
            }

            return "double_progression";
          })();

          if (progressionStrategy === "no_progression") {
            skippedProgressionUpdatesV2.push({
              exerciseEntry,
              workoutTemplateExerciseEntryId,
              reason: "Progression skipped because this exercise is marked no_progression.",
              inputSnapshot: {
                version: "v2",
                performedAt: completedAt.toISOString(),
                workoutSessionId: workoutSessionGraph.session.id,
                exerciseEntryId: exerciseEntry.id,
                workoutTemplateExerciseEntryId,
                state: {
                  currentWeightLbs: progressionStateV2.currentWeightLbs,
                  lastCompletedWeightLbs: progressionStateV2.lastCompletedWeightLbs,
                  consecutiveFailures: progressionStateV2.consecutiveFailures,
                  lastEffortFeedback: progressionStateV2.lastEffortFeedback,
                  lastPerformedAt: progressionStateV2.lastPerformedAt?.toISOString() ?? null,
                  repGoal: progressionStateV2.repGoal,
                  repRangeMin: progressionStateV2.repRangeMin,
                  repRangeMax: progressionStateV2.repRangeMax
                },
                exercise: {
                  exerciseId: exerciseEntry.exerciseId,
                  exerciseName: exerciseEntry.exerciseNameSnapshot,
                  exerciseCategory: progressionSeed.exerciseCategory,
                  incrementLbs: progressionSeed.incrementLbs,
                  isBodyweight: progressionSeed.isBodyweight,
                  isWeightOptional: progressionSeed.isWeightOptional,
                  progressionStrategy
                },
                outcome: {
                  effortFeedback: null,
                  hasFailure,
                  sets: relatedSets.map((set) => ({
                    setId: set.id,
                    status: set.status,
                    targetReps: set.targetReps,
                    actualReps: set.actualReps,
                    targetWeightLbs: set.targetWeightLbs,
                    actualWeightLbs: set.actualWeightLbs
                  }))
                }
              }
            });
            continue;
          }

          const effortFeedback = exerciseFeedbackByEntryId[exerciseEntry.id];
          if (!effortFeedback) {
            skippedProgressionUpdatesV2.push({
              exerciseEntry,
              workoutTemplateExerciseEntryId,
              reason: "Progression skipped because effort feedback was not provided.",
              inputSnapshot: {
                version: "v2",
                performedAt: completedAt.toISOString(),
                workoutSessionId: workoutSessionGraph.session.id,
                exerciseEntryId: exerciseEntry.id,
                workoutTemplateExerciseEntryId,
                state: {
                  currentWeightLbs: progressionStateV2.currentWeightLbs,
                  lastCompletedWeightLbs: progressionStateV2.lastCompletedWeightLbs,
                  consecutiveFailures: progressionStateV2.consecutiveFailures,
                  lastEffortFeedback: progressionStateV2.lastEffortFeedback,
                  lastPerformedAt: progressionStateV2.lastPerformedAt?.toISOString() ?? null,
                  repGoal: progressionStateV2.repGoal,
                  repRangeMin: progressionStateV2.repRangeMin,
                  repRangeMax: progressionStateV2.repRangeMax
                },
                exercise: {
                  exerciseId: exerciseEntry.exerciseId,
                  exerciseName: exerciseEntry.exerciseNameSnapshot,
                  exerciseCategory: progressionSeed.exerciseCategory,
                  incrementLbs: progressionSeed.incrementLbs,
                  isBodyweight: progressionSeed.isBodyweight,
                  isWeightOptional: progressionSeed.isWeightOptional,
                  progressionStrategy
                },
                outcome: {
                  effortFeedback: null,
                  hasFailure,
                  sets: relatedSets.map((set) => ({
                    setId: set.id,
                    status: set.status,
                    targetReps: set.targetReps,
                    actualReps: set.actualReps,
                    targetWeightLbs: set.targetWeightLbs,
                    actualWeightLbs: set.actualWeightLbs
                  }))
                }
              }
            });
            continue;
          }

          const progressionResult = this.progressionEngine.calculateWithStrategyV2({
            strategy: progressionStrategy,
            experienceLevel,
            trainingGoal: progressionGoal,
            state: {
              currentWeightLbs: progressionStateV2.currentWeightLbs,
              lastCompletedWeightLbs: progressionStateV2.lastCompletedWeightLbs,
              consecutiveFailures: progressionStateV2.consecutiveFailures,
              lastEffortFeedback: progressionStateV2.lastEffortFeedback,
              lastPerformedAt: progressionStateV2.lastPerformedAt,
              repGoal: progressionStateV2.repGoal,
              repRangeMin: progressionStateV2.repRangeMin,
              repRangeMax: progressionStateV2.repRangeMax
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
            },
            performedAt: completedAt
          });

          computedProgressionUpdatesV2.push({
            exerciseEntry,
            workoutTemplateExerciseEntryId,
            progressionResult,
            inputSnapshot: {
              version: "v2",
              performedAt: completedAt.toISOString(),
              workoutSessionId: workoutSessionGraph.session.id,
              exerciseEntryId: exerciseEntry.id,
              workoutTemplateExerciseEntryId,
              state: {
                currentWeightLbs: progressionStateV2.currentWeightLbs,
                lastCompletedWeightLbs: progressionStateV2.lastCompletedWeightLbs,
                consecutiveFailures: progressionStateV2.consecutiveFailures,
                lastEffortFeedback: progressionStateV2.lastEffortFeedback,
                lastPerformedAt: progressionStateV2.lastPerformedAt?.toISOString() ?? null,
                repGoal: progressionStateV2.repGoal,
                repRangeMin: progressionStateV2.repRangeMin,
                repRangeMax: progressionStateV2.repRangeMax
              },
              exercise: {
                exerciseId: exerciseEntry.exerciseId,
                exerciseName: exerciseEntry.exerciseNameSnapshot,
                exerciseCategory: progressionSeed.exerciseCategory,
                incrementLbs: progressionSeed.incrementLbs,
                isBodyweight: progressionSeed.isBodyweight,
                isWeightOptional: progressionSeed.isWeightOptional,
                progressionStrategy
              },
              outcome: {
                effortFeedback,
                hasFailure,
                sets: relatedSets.map((set) => ({
                  setId: set.id,
                  status: set.status,
                  targetReps: set.targetReps,
                  actualReps: set.actualReps,
                  targetWeightLbs: set.targetWeightLbs,
                  actualWeightLbs: set.actualWeightLbs
                }))
              }
            }
          });
        }

        const computedProgressionUpdatesV1Direct: Array<{
          exerciseEntry: typeof progressionEligibleExerciseEntries[number];
          progressionResult: ReturnType<ProgressionEngine["calculate"]>;
          inputSnapshot: Record<string, unknown>;
        }> = [];
        const skippedProgressionUpdatesV1Direct: Array<{
          exerciseEntry: typeof progressionEligibleExerciseEntries[number];
          reason: string;
          inputSnapshot: Record<string, unknown>;
        }> = [];

        for (const exerciseEntry of progressionEligibleEntriesWithoutTemplateEntry) {
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
            skippedProgressionUpdatesV1Direct.push({
              exerciseEntry,
              reason: "Progression skipped because effort feedback was not provided.",
              inputSnapshot: {
                version: "v1",
                performedAt: completedAt.toISOString(),
                workoutSessionId: workoutSessionGraph.session.id,
                exerciseEntryId: exerciseEntry.id,
                state: {
                  currentWeightLbs: progressionState.currentWeightLbs,
                  lastCompletedWeightLbs: progressionState.lastCompletedWeightLbs,
                  consecutiveFailures: progressionState.consecutiveFailures,
                  lastEffortFeedback: progressionState.lastEffortFeedback,
                  lastPerformedAt: progressionState.lastPerformedAt?.toISOString() ?? null
                },
                exercise: {
                  exerciseId: exerciseEntry.exerciseId,
                  exerciseName: exerciseEntry.exerciseNameSnapshot,
                  exerciseCategory: progressionSeed.exerciseCategory,
                  incrementLbs: progressionSeed.incrementLbs,
                  isBodyweight: progressionSeed.isBodyweight,
                  isWeightOptional: progressionSeed.isWeightOptional
                },
                outcome: {
                  effortFeedback: null,
                  hasFailure,
                  sets: relatedSets.map((set) => ({
                    setId: set.id,
                    status: set.status,
                    targetReps: set.targetReps,
                    actualReps: set.actualReps,
                    targetWeightLbs: set.targetWeightLbs,
                    actualWeightLbs: set.actualWeightLbs
                  }))
                }
              }
            });
            continue;
          }

          const progressionResult = this.progressionEngine.calculate({
            experienceLevel,
            trainingGoal: progressionGoal,
            state: {
              currentWeightLbs: progressionState.currentWeightLbs,
              lastCompletedWeightLbs: progressionState.lastCompletedWeightLbs,
              consecutiveFailures: progressionState.consecutiveFailures,
              lastEffortFeedback: progressionState.lastEffortFeedback,
              lastPerformedAt: progressionState.lastPerformedAt
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
            },
            performedAt: completedAt
          });

          computedProgressionUpdatesV1Direct.push({
            exerciseEntry,
            progressionResult,
            inputSnapshot: {
              version: "v1",
              performedAt: completedAt.toISOString(),
              workoutSessionId: workoutSessionGraph.session.id,
              exerciseEntryId: exerciseEntry.id,
              state: {
                currentWeightLbs: progressionState.currentWeightLbs,
                lastCompletedWeightLbs: progressionState.lastCompletedWeightLbs,
                consecutiveFailures: progressionState.consecutiveFailures,
                lastEffortFeedback: progressionState.lastEffortFeedback,
                lastPerformedAt: progressionState.lastPerformedAt?.toISOString() ?? null
              },
              exercise: {
                exerciseId: exerciseEntry.exerciseId,
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
                  setId: set.id,
                  status: set.status,
                  targetReps: set.targetReps,
                  actualReps: set.actualReps,
                  targetWeightLbs: set.targetWeightLbs,
                  actualWeightLbs: set.actualWeightLbs
                }))
              }
            }
          });
        }

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

        if (computedProgressionUpdatesV2.length > 0) {
          await this.progressionStateV2Repository.updateMany(
            computedProgressionUpdatesV2.map(({ workoutTemplateExerciseEntryId, progressionResult }) => {
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
                repGoal: progressionResult.nextState.repGoal,
                repRangeMin: existing.repRangeMin,
                repRangeMax: existing.repRangeMax,
                consecutiveFailures: progressionResult.nextState.consecutiveFailures,
                lastEffortFeedback: progressionResult.nextState.lastEffortFeedback,
                lastPerformedAt: completedAt
              };
            }),
            { tx }
          );
        }

        const progressionUpdatesV1FromV2 = computedProgressionUpdatesV2
          .filter(({ progressionResult }) => progressionResult.nextWeightLbs !== progressionResult.previousWeightLbs)
          .map(({ exerciseEntry, progressionResult }) => {
          const progressionState = progressionStateV1ByExerciseId.get(exerciseEntry.exerciseId);
          if (!progressionState) {
            throw new WorkoutApplicationError(
              "PROGRESSION_STATE_NOT_FOUND",
              `Progression state not found for exercise ${exerciseEntry.exerciseId}.`
            );
          }

          return {
            userId: input.context.userId,
            exerciseId: exerciseEntry.exerciseId,
            currentWeightLbs: progressionResult.nextState.currentWeightLbs,
            lastCompletedWeightLbs: progressionResult.nextState.lastCompletedWeightLbs,
            consecutiveFailures: 0,
            lastEffortFeedback: progressionResult.nextState.lastEffortFeedback,
            lastPerformedAt: completedAt
          };
        });

        const progressionUpdatesV1DirectPersist = computedProgressionUpdatesV1Direct.map(({ exerciseEntry, progressionResult }) => ({
          userId: input.context.userId,
          exerciseId: exerciseEntry.exerciseId,
          currentWeightLbs: progressionResult.nextState.currentWeightLbs,
          lastCompletedWeightLbs: progressionResult.nextState.lastCompletedWeightLbs,
          consecutiveFailures: progressionResult.nextState.consecutiveFailures,
          lastEffortFeedback: progressionResult.nextState.lastEffortFeedback,
          lastPerformedAt: completedAt
        }));

        const progressionUpdatesV1 = [...progressionUpdatesV1FromV2, ...progressionUpdatesV1DirectPersist];

        if (progressionUpdatesV1.length > 0) {
          await this.progressionStateRepository.updateMany(progressionUpdatesV1, { tx });
        }

        const progressMetricInputs = [
          ...computedProgressionUpdatesV2
            .filter(
              ({ progressionResult }) =>
                (progressionResult.result === "increased" || progressionResult.result === "recalibrated") &&
                progressionResult.nextWeightLbs !== progressionResult.previousWeightLbs
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
          ...computedProgressionUpdatesV1Direct
            .filter(
              ({ progressionResult }) =>
                (progressionResult.result === "increased" || progressionResult.result === "recalibrated") &&
                progressionResult.nextWeightLbs !== progressionResult.previousWeightLbs
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

        const progressionUpdates: ProgressionUpdateDto[] = [];
        const recommendationEventInputs: CreateProgressionRecommendationEventInput[] = [];

        for (const { exerciseEntry, workoutTemplateExerciseEntryId, progressionResult, inputSnapshot } of computedProgressionUpdatesV2) {
          const relatedSets = workoutSessionGraph.sets.filter((set) => set.exerciseEntryId === exerciseEntry.id);
          const loggedSets = relatedSets.filter((set) => set.status === "completed" || set.status === "failed");
          const missingActualWeight = loggedSets.some((set) => set.actualWeightLbs === null);
          const explanation = buildProgressionExplanation({
            result: progressionResult.result,
            reason: progressionResult.reason,
            previousWeightLbs: progressionResult.previousWeightLbs,
            nextWeightLbs: progressionResult.nextWeightLbs,
            previousRepGoal: progressionResult.previousRepGoal,
            nextRepGoal: progressionResult.nextRepGoal,
            effortFeedback: exerciseFeedbackByEntryId[exerciseEntry.id] ?? null,
            workoutIsPartial: workoutSessionGraph.session.isPartial,
            totalSetCount: relatedSets.length,
            loggedSetCount: loggedSets.length,
            hasFailedSets: loggedSets.some((set) => set.status === "failed"),
            missingActualWeight,
            lastPerformedAt: v2StateByTemplateEntryId.get(workoutTemplateExerciseEntryId)?.lastPerformedAt ?? null,
            performedAt: completedAt,
            trainingGoal,
            goalSource,
            experienceLevel
          });

          progressionUpdates.push(
            mapProgressionUpdateDto({
              exerciseId: exerciseEntry.exerciseId,
              exerciseName: exerciseEntry.exerciseNameSnapshot,
              previousWeightLbs: progressionResult.previousWeightLbs,
              nextWeightLbs: progressionResult.nextWeightLbs,
              previousRepGoal: progressionResult.previousRepGoal,
              nextRepGoal: progressionResult.nextRepGoal,
              result: progressionResult.result,
              reason: progressionResult.reason,
              confidence: explanation.confidence,
              reasonCodes: explanation.reasonCodes,
              evidence: explanation.evidence
            })
          );

          recommendationEventInputs.push(
            buildRecommendationEventInput({
              userId: input.context.userId,
              exerciseId: exerciseEntry.exerciseId,
              workoutTemplateExerciseEntryId,
              workoutSessionId: workoutSessionGraph.session.id,
              exerciseEntryId: exerciseEntry.id,
              previousWeightLbs: progressionResult.previousWeightLbs,
              nextWeightLbs: progressionResult.nextWeightLbs,
              previousRepGoal: progressionResult.previousRepGoal,
              nextRepGoal: progressionResult.nextRepGoal,
              result: progressionResult.result,
              reason: progressionResult.reason,
              confidence: explanation.confidence,
              reasonCodes: explanation.reasonCodes,
              evidence: explanation.evidence,
              inputSnapshot
            })
          );
        }

        for (const { exerciseEntry, progressionResult, inputSnapshot } of computedProgressionUpdatesV1Direct) {
          const relatedSets = workoutSessionGraph.sets.filter((set) => set.exerciseEntryId === exerciseEntry.id);
          const loggedSets = relatedSets.filter((set) => set.status === "completed" || set.status === "failed");
          const missingActualWeight = loggedSets.some((set) => set.actualWeightLbs === null);
          const effortFeedback = exerciseFeedbackByEntryId[exerciseEntry.id] ?? null;
          const progressionState = progressionStateV1ByExerciseId.get(exerciseEntry.exerciseId) ?? null;
          const explanation = buildProgressionExplanation({
            result: progressionResult.result,
            reason: progressionResult.reason,
            previousWeightLbs: progressionResult.previousWeightLbs,
            nextWeightLbs: progressionResult.nextWeightLbs,
            previousRepGoal: exerciseEntry.targetReps,
            nextRepGoal: exerciseEntry.targetReps,
            effortFeedback,
            workoutIsPartial: workoutSessionGraph.session.isPartial,
            totalSetCount: relatedSets.length,
            loggedSetCount: loggedSets.length,
            hasFailedSets: loggedSets.some((set) => set.status === "failed"),
            missingActualWeight,
            lastPerformedAt: progressionState?.lastPerformedAt ?? null,
            performedAt: completedAt,
            trainingGoal,
            goalSource,
            experienceLevel
          });

          progressionUpdates.push(
            mapProgressionUpdateDto({
              exerciseId: exerciseEntry.exerciseId,
              exerciseName: exerciseEntry.exerciseNameSnapshot,
              previousWeightLbs: progressionResult.previousWeightLbs,
              nextWeightLbs: progressionResult.nextWeightLbs,
              previousRepGoal: exerciseEntry.targetReps,
              nextRepGoal: exerciseEntry.targetReps,
              result: progressionResult.result,
              reason: progressionResult.reason,
              confidence: explanation.confidence,
              reasonCodes: explanation.reasonCodes,
              evidence: explanation.evidence
            })
          );

          recommendationEventInputs.push(
            buildRecommendationEventInput({
              userId: input.context.userId,
              exerciseId: exerciseEntry.exerciseId,
              workoutTemplateExerciseEntryId: null,
              workoutSessionId: workoutSessionGraph.session.id,
              exerciseEntryId: exerciseEntry.id,
              previousWeightLbs: progressionResult.previousWeightLbs,
              nextWeightLbs: progressionResult.nextWeightLbs,
              previousRepGoal: exerciseEntry.targetReps,
              nextRepGoal: exerciseEntry.targetReps,
              result: progressionResult.result,
              reason: progressionResult.reason,
              confidence: explanation.confidence,
              reasonCodes: explanation.reasonCodes,
              evidence: explanation.evidence,
              inputSnapshot
            })
          );
        }

        for (const { exerciseEntry, workoutTemplateExerciseEntryId, reason, inputSnapshot } of skippedProgressionUpdatesV2) {
          const progressionStateV2 = v2StateByTemplateEntryId.get(workoutTemplateExerciseEntryId);
          if (!progressionStateV2) {
            throw new WorkoutApplicationError(
              "PROGRESSION_STATE_NOT_FOUND",
              `Progression state v2 not found for template entry ${workoutTemplateExerciseEntryId}.`
            );
          }

          const relatedSets = workoutSessionGraph.sets.filter((set) => set.exerciseEntryId === exerciseEntry.id);
          const loggedSets = relatedSets.filter((set) => set.status === "completed" || set.status === "failed");
          const missingActualWeight = loggedSets.some((set) => set.actualWeightLbs === null);
          const explanation = buildProgressionExplanation({
            result: "skipped",
            reason,
            previousWeightLbs: progressionStateV2.currentWeightLbs,
            nextWeightLbs: progressionStateV2.currentWeightLbs,
            previousRepGoal: progressionStateV2.repGoal,
            nextRepGoal: progressionStateV2.repGoal,
            effortFeedback: null,
            workoutIsPartial: workoutSessionGraph.session.isPartial,
            totalSetCount: relatedSets.length,
            loggedSetCount: loggedSets.length,
            hasFailedSets: loggedSets.some((set) => set.status === "failed"),
            missingActualWeight,
            lastPerformedAt: progressionStateV2.lastPerformedAt,
            performedAt: completedAt,
            trainingGoal,
            goalSource,
            experienceLevel
          });

          progressionUpdates.push(
            mapProgressionUpdateDto({
              exerciseId: exerciseEntry.exerciseId,
              exerciseName: exerciseEntry.exerciseNameSnapshot,
              previousWeightLbs: progressionStateV2.currentWeightLbs,
              nextWeightLbs: progressionStateV2.currentWeightLbs,
              previousRepGoal: progressionStateV2.repGoal,
              nextRepGoal: progressionStateV2.repGoal,
              result: "skipped",
              reason,
              confidence: explanation.confidence,
              reasonCodes: explanation.reasonCodes,
              evidence: explanation.evidence
            })
          );

          recommendationEventInputs.push(
            buildRecommendationEventInput({
              userId: input.context.userId,
              exerciseId: exerciseEntry.exerciseId,
              workoutTemplateExerciseEntryId,
              workoutSessionId: workoutSessionGraph.session.id,
              exerciseEntryId: exerciseEntry.id,
              previousWeightLbs: progressionStateV2.currentWeightLbs,
              nextWeightLbs: progressionStateV2.currentWeightLbs,
              previousRepGoal: progressionStateV2.repGoal,
              nextRepGoal: progressionStateV2.repGoal,
              result: "skipped",
              reason,
              confidence: explanation.confidence,
              reasonCodes: explanation.reasonCodes,
              evidence: explanation.evidence,
              inputSnapshot
            })
          );
        }

        for (const { exerciseEntry, reason, inputSnapshot } of skippedProgressionUpdatesV1Direct) {
          const progressionState = progressionStateV1ByExerciseId.get(exerciseEntry.exerciseId);
          if (!progressionState) {
            throw new WorkoutApplicationError(
              "PROGRESSION_STATE_NOT_FOUND",
              `Progression state not found for exercise ${exerciseEntry.exerciseId}.`
            );
          }

          const relatedSets = workoutSessionGraph.sets.filter((set) => set.exerciseEntryId === exerciseEntry.id);
          const loggedSets = relatedSets.filter((set) => set.status === "completed" || set.status === "failed");
          const missingActualWeight = loggedSets.some((set) => set.actualWeightLbs === null);
          const explanation = buildProgressionExplanation({
            result: "skipped",
            reason,
            previousWeightLbs: progressionState.currentWeightLbs,
            nextWeightLbs: progressionState.currentWeightLbs,
            previousRepGoal: exerciseEntry.targetReps,
            nextRepGoal: exerciseEntry.targetReps,
            effortFeedback: null,
            workoutIsPartial: workoutSessionGraph.session.isPartial,
            totalSetCount: relatedSets.length,
            loggedSetCount: loggedSets.length,
            hasFailedSets: loggedSets.some((set) => set.status === "failed"),
            missingActualWeight,
            lastPerformedAt: progressionState.lastPerformedAt,
            performedAt: completedAt,
            trainingGoal,
            goalSource,
            experienceLevel
          });

          progressionUpdates.push(
            mapProgressionUpdateDto({
              exerciseId: exerciseEntry.exerciseId,
              exerciseName: exerciseEntry.exerciseNameSnapshot,
              previousWeightLbs: progressionState.currentWeightLbs,
              nextWeightLbs: progressionState.currentWeightLbs,
              previousRepGoal: exerciseEntry.targetReps,
              nextRepGoal: exerciseEntry.targetReps,
              result: "skipped",
              reason,
              confidence: explanation.confidence,
              reasonCodes: explanation.reasonCodes,
              evidence: explanation.evidence
            })
          );

          recommendationEventInputs.push(
            buildRecommendationEventInput({
              userId: input.context.userId,
              exerciseId: exerciseEntry.exerciseId,
              workoutTemplateExerciseEntryId: null,
              workoutSessionId: workoutSessionGraph.session.id,
              exerciseEntryId: exerciseEntry.id,
              previousWeightLbs: progressionState.currentWeightLbs,
              nextWeightLbs: progressionState.currentWeightLbs,
              previousRepGoal: exerciseEntry.targetReps,
              nextRepGoal: exerciseEntry.targetReps,
              result: "skipped",
              reason,
              confidence: explanation.confidence,
              reasonCodes: explanation.reasonCodes,
              evidence: explanation.evidence,
              inputSnapshot
            })
          );
        }

        for (const exerciseEntry of partialExerciseEntries) {
          const relatedSets = workoutSessionGraph.sets.filter((set) => set.exerciseEntryId === exerciseEntry.id);
          const loggedSetCount = relatedSets.filter((set) => set.status === "completed" || set.status === "failed").length;
          const totalSetCount = relatedSets.length;
          const reason = `No progression update because this exercise was only partially completed (${loggedSetCount} of ${totalSetCount} sets logged; unlogged sets were skipped).`;
          const explanation = buildProgressionExplanation({
            result: "skipped",
            reason,
            previousWeightLbs: exerciseEntry.targetWeightLbs,
            nextWeightLbs: exerciseEntry.targetWeightLbs,
            previousRepGoal: exerciseEntry.targetReps,
            nextRepGoal: exerciseEntry.targetReps,
            effortFeedback: exerciseFeedbackByEntryId[exerciseEntry.id] ?? null,
            workoutIsPartial: true,
            totalSetCount,
            loggedSetCount,
            hasFailedSets: relatedSets.some((set) => set.status === "failed"),
            missingActualWeight: relatedSets.some(
              (set) => (set.status === "completed" || set.status === "failed") && set.actualWeightLbs === null
            ),
            lastPerformedAt: null,
            performedAt: completedAt,
            trainingGoal,
            goalSource,
            experienceLevel
          });

          const workoutTemplateExerciseEntryId =
            exerciseEntry.workoutTemplateExerciseEntryId ?? fallbackTemplateEntryIdBySequenceOrder.get(exerciseEntry.sequenceOrder) ?? null;

          progressionUpdates.push(
            mapProgressionUpdateDto({
              exerciseId: exerciseEntry.exerciseId,
              exerciseName: exerciseEntry.exerciseNameSnapshot,
              previousWeightLbs: exerciseEntry.targetWeightLbs,
              nextWeightLbs: exerciseEntry.targetWeightLbs,
              previousRepGoal: exerciseEntry.targetReps,
              nextRepGoal: exerciseEntry.targetReps,
              result: "skipped",
              reason,
              confidence: explanation.confidence,
              reasonCodes: explanation.reasonCodes,
              evidence: explanation.evidence
            })
          );

          recommendationEventInputs.push(
            buildRecommendationEventInput({
              userId: input.context.userId,
              exerciseId: exerciseEntry.exerciseId,
              workoutTemplateExerciseEntryId,
              workoutSessionId: workoutSessionGraph.session.id,
              exerciseEntryId: exerciseEntry.id,
              previousWeightLbs: exerciseEntry.targetWeightLbs,
              nextWeightLbs: exerciseEntry.targetWeightLbs,
              previousRepGoal: exerciseEntry.targetReps,
              nextRepGoal: exerciseEntry.targetReps,
              result: "skipped",
              reason,
              confidence: explanation.confidence,
              reasonCodes: explanation.reasonCodes,
              evidence: explanation.evidence,
              inputSnapshot: {
                version: workoutTemplateExerciseEntryId ? "v2" : "v1",
                performedAt: completedAt.toISOString(),
                workoutSessionId: workoutSessionGraph.session.id,
                exerciseEntryId: exerciseEntry.id,
                workoutTemplateExerciseEntryId,
                state: null,
                exercise: {
                  exerciseId: exerciseEntry.exerciseId,
                  exerciseName: exerciseEntry.exerciseNameSnapshot
                },
                outcome: {
                  effortFeedback: exerciseFeedbackByEntryId[exerciseEntry.id] ?? null,
                  hasFailure: relatedSets.some((set) => set.status === "failed"),
                  sets: relatedSets.map((set) => ({
                    setId: set.id,
                    status: set.status,
                    targetReps: set.targetReps,
                    actualReps: set.actualReps,
                    targetWeightLbs: set.targetWeightLbs,
                    actualWeightLbs: set.actualWeightLbs
                  }))
                }
              }
            })
          );
        }

        if (recommendationEventInputs.length > 0) {
          await this.progressionRecommendationEventRepository.createMany(recommendationEventInputs, { tx });
        }

        return {
          workoutSession: mapWorkoutSessionDto(completedWorkoutSessionGraph),
          progressionUpdates,
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
