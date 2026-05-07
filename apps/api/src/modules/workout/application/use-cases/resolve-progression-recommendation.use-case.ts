import type { ProgressionRecommendationResolutionType } from "@fitness/shared";
import { WorkoutApplicationError } from "../errors/workout-application.error.js";
import type { ProgressionRecommendationEventRepository } from "../../repositories/interfaces/progression-recommendation-event.repository.js";
import type { ProgressionStateRepository } from "../../repositories/interfaces/progression-state.repository.js";
import type { ProgressionStateV2Repository } from "../../repositories/interfaces/progression-state-v2.repository.js";
import type { ExerciseRepository } from "../../repositories/interfaces/exercise.repository.js";
import type { ExerciseProgressionSettingsRepository } from "../../repositories/interfaces/exercise-progression-settings.repository.js";
import type { TransactionManager } from "../services/transaction-manager.js";
import type { RequestContext } from "../types/request-context.js";
import type { UseCaseResult } from "../types/use-case-result.js";
import type { ResolveProgressionRecommendationResponse } from "@fitness/shared";
import { mapProgressionRecommendationEventDto } from "../mappers/workout-dto.mapper.js";
import type { RepositoryTransaction } from "../../repositories/models/persistence-context.js";

function isResolvableEvent(input: { confidence: string; result: string; reasonCodes: string[] }) {
  if (input.confidence === "low") {
    return true;
  }

  const reasonCodes = input.reasonCodes ?? [];
  return (
    input.result === "recalibrated" ||
    reasonCodes.includes("REPS_GREATLY_EXCEEDED_TARGET") ||
    reasonCodes.includes("CONFLICTING_EFFORT_SIGNALS") ||
    reasonCodes.includes("MIN_CONFIDENCE_GATE_BLOCKED_INCREASE")
  );
}

function roundToTwoDecimals(value: number) {
  return Math.round(value * 100) / 100;
}

function resolveSmallerIncrease(input: {
  previousWeightLbs: number;
  originalNextWeightLbs: number;
  incrementLbs: number;
  maxJumpPerSessionLbs: number | null;
}) {
  const originalDelta = input.originalNextWeightLbs - input.previousWeightLbs;
  if (!Number.isFinite(originalDelta) || originalDelta <= 0) {
    return input.previousWeightLbs;
  }

  const maxAllowedDelta =
    input.maxJumpPerSessionLbs == null ? originalDelta : Math.min(originalDelta, input.maxJumpPerSessionLbs);

  const desiredDelta = Math.min(input.incrementLbs, maxAllowedDelta);
  const roundedDelta =
    input.incrementLbs > 0 ? Math.floor(desiredDelta / input.incrementLbs) * input.incrementLbs : 0;

  if (!Number.isFinite(roundedDelta) || roundedDelta <= 0) {
    return input.previousWeightLbs;
  }

  const next = input.previousWeightLbs + roundedDelta;
  return roundToTwoDecimals(Math.min(next, input.originalNextWeightLbs));
}

export class ResolveProgressionRecommendationUseCase {
  public constructor(
    private readonly progressionRecommendationEventRepository: ProgressionRecommendationEventRepository,
    private readonly progressionStateRepository: ProgressionStateRepository,
    private readonly progressionStateV2Repository: ProgressionStateV2Repository,
    private readonly exerciseRepository: ExerciseRepository,
    private readonly exerciseProgressionSettingsRepository: ExerciseProgressionSettingsRepository,
    private readonly transactionManager: TransactionManager
  ) {}

  public async execute(input: {
    context: RequestContext;
    sessionId: string;
    eventId: string;
    resolutionType: ProgressionRecommendationResolutionType;
    note: string | null;
    relatedSetIds: string[] | null;
  }): Promise<UseCaseResult<ResolveProgressionRecommendationResponse>> {
    if (input.resolutionType === "unresolved") {
      throw new WorkoutApplicationError("VALIDATION_ERROR", "resolutionType must not be unresolved.");
    }

    const result = await this.transactionManager.runInTransaction(async (tx: RepositoryTransaction) => {
      const event = await this.progressionRecommendationEventRepository.findOwnedById(
        input.context.userId,
        input.eventId,
        { tx }
      );

      if (!event || event.workoutSessionId !== input.sessionId) {
        throw new WorkoutApplicationError("SESSION_NOT_FOUND", "Progression recommendation was not found.");
      }

      if (!isResolvableEvent({ confidence: event.confidence, result: event.result, reasonCodes: event.reasonCodes })) {
        throw new WorkoutApplicationError(
          "BUSINESS_RULE_VIOLATION",
          "This recommendation does not require resolution."
        );
      }

      if (event.resolutionType !== "unresolved") {
        if (event.resolutionType === input.resolutionType) {
          return event;
        }

        throw new WorkoutApplicationError(
          "BUSINESS_RULE_VIOLATION",
          "This recommendation has already been resolved."
        );
      }

      if (input.resolutionType === "ignored_bad_data" || input.resolutionType === "set_corrected") {
        // TODO(progression-resolution): Support bad-data exclusion / set-edit-triggered recalculation.
        // For now we persist only accept/smaller_increase/keep_current/retest_next_time.
        throw new WorkoutApplicationError(
          "BUSINESS_RULE_VIOLATION",
          "This resolution option is not supported yet."
        );
      }

      const previousWeightLbs = event.previousWeightLbs;
      const previousRepGoal = event.previousRepGoal;

      let finalNextWeightLbs = event.nextWeightLbs;
      let finalNextRepGoal = event.nextRepGoal;

      if (input.resolutionType === "keep_current" || input.resolutionType === "retest_next_time") {
        finalNextWeightLbs = previousWeightLbs;
        finalNextRepGoal = previousRepGoal;
      } else if (input.resolutionType === "smaller_increase") {
        if (!event.exerciseId) {
          throw new WorkoutApplicationError(
            "BUSINESS_RULE_VIOLATION",
            "This recommendation cannot be adjusted without an exercise id."
          );
        }

        const [seed] = await this.exerciseRepository.findProgressionSeedsByExerciseIds([event.exerciseId], { tx });
        if (!seed) {
          throw new WorkoutApplicationError("PROGRESSION_SEED_NOT_FOUND", "Exercise progression seed was not found.");
        }

        const settings = await this.exerciseProgressionSettingsRepository.findByUserIdAndExerciseId(
          input.context.userId,
          event.exerciseId,
          { tx }
        );

        const incrementLbs = settings?.incrementOverrideLbs ?? seed.incrementLbs;
        const maxJumpPerSessionLbs = settings?.maxJumpPerSessionLbs ?? null;

        finalNextWeightLbs = resolveSmallerIncrease({
          previousWeightLbs,
          originalNextWeightLbs: event.nextWeightLbs,
          incrementLbs,
          maxJumpPerSessionLbs
        });
      }

      if (event.workoutTemplateExerciseEntryId) {
        const [state] = await this.progressionStateV2Repository.findByUserIdAndTemplateEntryIds(
          input.context.userId,
          [event.workoutTemplateExerciseEntryId],
          { tx }
        );

        if (!state) {
          throw new WorkoutApplicationError("PROGRESSION_STATE_NOT_FOUND", "Progression state was not found.");
        }

        await this.progressionStateV2Repository.updateMany(
          [
            {
              userId: state.userId,
              workoutTemplateExerciseEntryId: state.workoutTemplateExerciseEntryId,
              currentWeightLbs: finalNextWeightLbs,
              lastCompletedWeightLbs: state.lastCompletedWeightLbs,
              repGoal: finalNextRepGoal ?? state.repGoal,
              repRangeMin: state.repRangeMin,
              repRangeMax: state.repRangeMax,
              consecutiveFailures: state.consecutiveFailures,
              lastEffortFeedback: state.lastEffortFeedback,
              lastPerformedAt: state.lastPerformedAt
            }
          ],
          { tx }
        );
      } else if (event.exerciseId) {
        const [state] = await this.progressionStateRepository.findByUserIdAndExerciseIds(
          input.context.userId,
          [event.exerciseId],
          { tx }
        );

        if (!state) {
          throw new WorkoutApplicationError("PROGRESSION_STATE_NOT_FOUND", "Progression state was not found.");
        }

        await this.progressionStateRepository.updateMany(
          [
            {
              userId: state.userId,
              exerciseId: state.exerciseId,
              currentWeightLbs: finalNextWeightLbs,
              lastCompletedWeightLbs: state.lastCompletedWeightLbs,
              consecutiveFailures: state.consecutiveFailures,
              lastEffortFeedback: state.lastEffortFeedback,
              lastPerformedAt: state.lastPerformedAt
            }
          ],
          { tx }
        );
      }

      const resolvedAt = new Date();
      return this.progressionRecommendationEventRepository.resolveOwnedEvent(
        {
          userId: input.context.userId,
          id: event.id,
          workoutSessionId: event.workoutSessionId,
          resolutionType: input.resolutionType,
          resolvedByUserId: input.context.userId,
          resolvedAt,
          note: input.note,
          resolutionOriginalSnapshot: {
            previousWeightLbs: event.previousWeightLbs,
            nextWeightLbs: event.nextWeightLbs,
            previousRepGoal: event.previousRepGoal,
            nextRepGoal: event.nextRepGoal
          },
          resolutionFinalSnapshot: {
            previousWeightLbs: event.previousWeightLbs,
            nextWeightLbs: finalNextWeightLbs,
            previousRepGoal: event.previousRepGoal,
            nextRepGoal: finalNextRepGoal
          },
          relatedSetIds: input.relatedSetIds
        },
        { tx }
      );
    });

    return {
      data: {
        progressionRecommendationEvent: mapProgressionRecommendationEventDto(result)
      },
      meta: {
        replayed: false
      }
    };
  }
}
