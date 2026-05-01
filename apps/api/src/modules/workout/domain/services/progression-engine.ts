import { MATERIAL_OVERPERFORMANCE_MULTIPLIER, type ExerciseCategory, type ProgressionStrategy } from "@fitness/shared";
import type {
  ProgressionComputationInput,
  ProgressionComputationResult,
  ProgressionComputationInputV2,
  ProgressionComputationResultV2,
  ProgressionStateSnapshot,
  ProgressionStateSnapshotV2,
  ExerciseWorkoutOutcome,
  ExerciseWorkoutSetOutcome
} from "../models/progression.js";

const MIN_RECALIBRATION_SET_COUNT = 2;
const MAX_RECALIBRATION_JUMP_MULTIPLIER = 1.75;
const RECENT_TRAINING_REPEAT_THRESHOLD_DAYS = 14;
const RECENT_TRAINING_REDUCTION_THRESHOLD_DAYS = 30;

function roundToTwoDecimals(value: number) {
  return Math.round(value * 100) / 100;
}

function roundDownToIncrement(weightLbs: number, incrementLbs: number) {
  if (incrementLbs <= 0) {
    throw new Error("incrementLbs must be greater than 0.");
  }

  const rounded = Math.floor(weightLbs / incrementLbs) * incrementLbs;
  return roundToTwoDecimals(Math.max(0, rounded));
}

function clampInteger(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function getSuccessIncreaseStepCount(category: ExerciseCategory, effortFeedback: ExerciseWorkoutOutcome["effortFeedback"]) {
  if (effortFeedback === "too_easy") {
    return category === "compound" ? 2 : 2;
  }

  return 1;
}

function daysSince(input: { previous: Date; current: Date }) {
  const ms = input.current.getTime() - input.previous.getTime();
  return Math.floor(ms / 86_400_000);
}

function median(values: number[]) {
  const sorted = [...values].sort((left, right) => left - right);
  const middleIndex = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 1) {
    return sorted[middleIndex]!;
  }

  return (sorted[middleIndex - 1]! + sorted[middleIndex]!) / 2;
}

function estimateOneRepMaxEpley(weightLbs: number, reps: number) {
  return weightLbs * (1 + reps / 30);
}

function estimateWorkingWeightFromOneRepMax(e1rm: number, targetReps: number) {
  return e1rm / (1 + targetReps / 30);
}

export function isMaterialOverperformanceSet(set: ExerciseWorkoutSetOutcome) {
  if (set.actualReps === null || set.actualWeightLbs === null) {
    return false;
  }

  return (
    set.actualReps > 0 &&
    set.targetWeightLbs > 0 &&
    set.actualWeightLbs >= set.targetWeightLbs * MATERIAL_OVERPERFORMANCE_MULTIPLIER
  );
}

function hasEffectiveFailure(outcome: ExerciseWorkoutOutcome) {
  if (!outcome.sets) {
    return outcome.hasFailure ?? false;
  }

  return outcome.sets.some(
    (set) =>
      set.actualReps !== null &&
      set.actualReps < set.targetReps &&
      !isMaterialOverperformanceSet(set)
  );
}

export class ProgressionEngine {
  public calculateWithStrategyV2(
    input: ProgressionComputationInputV2 & { strategy: ProgressionStrategy }
  ): ProgressionComputationResultV2 {
    switch (input.strategy) {
      case "double_progression": {
        return this.calculateDoubleProgression(input);
      }
      case "fixed_weight": {
        return this.calculateFixedWeight(input);
      }
      case "bodyweight_reps": {
        return this.calculateBodyweightReps(input);
      }
      case "bodyweight_weighted": {
        return this.calculateBodyweightWeighted(input);
      }
      case "no_progression": {
        const { state, outcome } = input;
        const previousWeightLbs = roundToTwoDecimals(state.currentWeightLbs);
        const previousRepGoal = state.repGoal;
        const repRangeMin = state.repRangeMin;
        const repRangeMax = state.repRangeMax;

        const nextState: ProgressionStateSnapshotV2 = {
          currentWeightLbs: previousWeightLbs,
          lastCompletedWeightLbs: state.lastCompletedWeightLbs,
          consecutiveFailures: state.consecutiveFailures,
          lastEffortFeedback: outcome.effortFeedback,
          lastPerformedAt: state.lastPerformedAt ?? null,
          repGoal: previousRepGoal,
          repRangeMin,
          repRangeMax
        };

        return {
          previousWeightLbs,
          nextWeightLbs: previousWeightLbs,
          previousRepGoal,
          nextRepGoal: previousRepGoal,
          result: "skipped",
          reason: "Progression skipped because this exercise is marked no_progression.",
          nextState
        };
      }
    }
  }

  public calculate(input: ProgressionComputationInput): ProgressionComputationResult {
    const { exercise, outcome, state } = input;
    const previousWeightLbs = roundToTwoDecimals(state.currentWeightLbs);
    const lastPerformedAt = state.lastPerformedAt ?? null;
    const performedAt = input.performedAt ?? new Date(0);

    if (previousWeightLbs < 0) {
      throw new Error("currentWeightLbs must be greater than or equal to 0.");
    }

    if (exercise.incrementLbs <= 0) {
      throw new Error("incrementLbs must be greater than 0.");
    }

    if (exercise.isBodyweight && !exercise.isWeightOptional) {
      const nextState: ProgressionStateSnapshot = {
        currentWeightLbs: previousWeightLbs,
        lastCompletedWeightLbs: state.lastCompletedWeightLbs,
        consecutiveFailures: state.consecutiveFailures,
        lastEffortFeedback: outcome.effortFeedback
      };

      return {
        previousWeightLbs,
        nextWeightLbs: previousWeightLbs,
        result: "skipped",
        reason: `No weight progression because ${exercise.exerciseName} is a bodyweight movement and weighted progression is not enabled.`,
        nextState
      };
    }

    if (exercise.isWeightOptional && previousWeightLbs === 0) {
      const nextState: ProgressionStateSnapshot = {
        currentWeightLbs: previousWeightLbs,
        lastCompletedWeightLbs: state.lastCompletedWeightLbs,
        consecutiveFailures: state.consecutiveFailures,
        lastEffortFeedback: outcome.effortFeedback
      };

      return {
        previousWeightLbs,
        nextWeightLbs: previousWeightLbs,
        result: "skipped",
        reason: `No weight progression because ${exercise.exerciseName} is weight-optional and you logged 0 lb of external load.`,
        nextState
      };
    }

    if (hasEffectiveFailure(outcome)) {
      return this.calculateFailureResult(input, previousWeightLbs);
    }

    if (lastPerformedAt) {
      const gapDays = daysSince({ previous: lastPerformedAt, current: performedAt });

      if (gapDays >= RECENT_TRAINING_REDUCTION_THRESHOLD_DAYS) {
        const nextWeightLbs = roundDownToIncrement(
          Math.max(0, previousWeightLbs - exercise.incrementLbs),
          exercise.incrementLbs
        );

        const nextState: ProgressionStateSnapshot = {
          currentWeightLbs: nextWeightLbs,
          lastCompletedWeightLbs: state.lastCompletedWeightLbs,
          consecutiveFailures: 0,
          lastEffortFeedback: outcome.effortFeedback,
          lastPerformedAt
        };

        return {
          previousWeightLbs,
          nextWeightLbs,
          result: "reduced",
          reason: "Reduced because this exercise has not been trained in over 30 days.",
          nextState
        };
      }

      if (gapDays >= RECENT_TRAINING_REPEAT_THRESHOLD_DAYS) {
        const nextState: ProgressionStateSnapshot = {
          currentWeightLbs: previousWeightLbs,
          lastCompletedWeightLbs: previousWeightLbs,
          consecutiveFailures: 0,
          lastEffortFeedback: outcome.effortFeedback,
          lastPerformedAt
        };

        return {
          previousWeightLbs,
          nextWeightLbs: previousWeightLbs,
          result: "repeated",
          reason: "Repeated because this exercise has not been trained recently.",
          nextState
        };
      }
    }

    const recalibrationResult = this.calculateRecalibrationResult(input, previousWeightLbs);
    if (recalibrationResult) {
      return recalibrationResult;
    }

    return this.calculateSuccessResult(input, previousWeightLbs);
  }

  public calculateDoubleProgression(input: ProgressionComputationInputV2): ProgressionComputationResultV2 {
    const { exercise, outcome, state } = input;

    const previousWeightLbs = roundToTwoDecimals(state.currentWeightLbs);
    const previousRepGoal = state.repGoal;
    const repRangeMin = state.repRangeMin;
    const repRangeMax = state.repRangeMax;
    const lastPerformedAt = state.lastPerformedAt ?? null;
    const performedAt = input.performedAt ?? new Date(0);

    if (!Number.isInteger(previousRepGoal) || !Number.isInteger(repRangeMin) || !Number.isInteger(repRangeMax)) {
      throw new Error("repGoal, repRangeMin, and repRangeMax must be integers.");
    }

    if (repRangeMin <= 0) {
      throw new Error("repRangeMin must be greater than 0.");
    }

    if (repRangeMax < repRangeMin) {
      throw new Error("repRangeMax must be greater than or equal to repRangeMin.");
    }

    if (previousRepGoal < repRangeMin || previousRepGoal > repRangeMax) {
      throw new Error("repGoal must be within the rep range.");
    }

    if (!outcome.sets || outcome.sets.length === 0) {
      throw new Error("Double progression requires per-set outcomes.");
    }

    if (previousWeightLbs < 0) {
      throw new Error("currentWeightLbs must be greater than or equal to 0.");
    }

    if (exercise.incrementLbs <= 0) {
      throw new Error("incrementLbs must be greater than 0.");
    }

    if (exercise.isBodyweight && !exercise.isWeightOptional) {
      const nextState: ProgressionStateSnapshotV2 = {
        currentWeightLbs: previousWeightLbs,
        lastCompletedWeightLbs: state.lastCompletedWeightLbs,
        consecutiveFailures: state.consecutiveFailures,
        lastEffortFeedback: outcome.effortFeedback,
        repGoal: previousRepGoal,
        repRangeMin,
        repRangeMax
      };

      return {
        previousWeightLbs,
        nextWeightLbs: previousWeightLbs,
        previousRepGoal,
        nextRepGoal: previousRepGoal,
        result: "skipped",
        reason: `No progression because ${exercise.exerciseName} is a bodyweight movement and weighted progression is not enabled.`,
        nextState
      };
    }

    if (exercise.isWeightOptional && previousWeightLbs === 0) {
      const nextState: ProgressionStateSnapshotV2 = {
        currentWeightLbs: previousWeightLbs,
        lastCompletedWeightLbs: state.lastCompletedWeightLbs,
        consecutiveFailures: state.consecutiveFailures,
        lastEffortFeedback: outcome.effortFeedback,
        repGoal: previousRepGoal,
        repRangeMin,
        repRangeMax
      };

      return {
        previousWeightLbs,
        nextWeightLbs: previousWeightLbs,
        previousRepGoal,
        nextRepGoal: previousRepGoal,
        result: "skipped",
        reason: `No progression because ${exercise.exerciseName} is weight-optional and you logged 0 lb of external load.`,
        nextState
      };
    }

    const hasBelowRangeMin = outcome.sets.some(
      (set) => (set.actualReps ?? 0) < repRangeMin && !isMaterialOverperformanceSet(set)
    );
    if (hasBelowRangeMin) {
      return this.calculateFailureResultV2(input, previousWeightLbs);
    }

    const metRepGoal = outcome.sets.every(
      (set) => (set.actualReps ?? 0) >= previousRepGoal || isMaterialOverperformanceSet(set)
    );
    if (!metRepGoal) {
      const nextState: ProgressionStateSnapshotV2 = {
        currentWeightLbs: previousWeightLbs,
        lastCompletedWeightLbs: state.lastCompletedWeightLbs,
        consecutiveFailures: 0,
        lastEffortFeedback: outcome.effortFeedback,
        repGoal: previousRepGoal,
        repRangeMin,
        repRangeMax
      };

      return {
        previousWeightLbs,
        nextWeightLbs: previousWeightLbs,
        previousRepGoal,
        nextRepGoal: previousRepGoal,
        result: "repeated",
        reason: `Repeated because reps were below the current rep goal of ${previousRepGoal} within range ${repRangeMin}–${repRangeMax}.`,
        nextState
      };
    }

    if (lastPerformedAt) {
      const gapDays = daysSince({ previous: lastPerformedAt, current: performedAt });

      if (gapDays >= RECENT_TRAINING_REDUCTION_THRESHOLD_DAYS) {
        const nextWeightLbs = roundDownToIncrement(
          Math.max(0, previousWeightLbs - exercise.incrementLbs),
          exercise.incrementLbs
        );
        const nextRepGoal = repRangeMin;

        const nextState: ProgressionStateSnapshotV2 = {
          currentWeightLbs: nextWeightLbs,
          lastCompletedWeightLbs: state.lastCompletedWeightLbs,
          consecutiveFailures: 0,
          lastEffortFeedback: outcome.effortFeedback,
          lastPerformedAt,
          repGoal: nextRepGoal,
          repRangeMin,
          repRangeMax
        };

        return {
          previousWeightLbs,
          nextWeightLbs,
          previousRepGoal,
          nextRepGoal,
          result: "reduced",
          reason: "Reduced because this exercise has not been trained in over 30 days.",
          nextState
        };
      }

      if (gapDays >= RECENT_TRAINING_REPEAT_THRESHOLD_DAYS) {
        const nextState: ProgressionStateSnapshotV2 = {
          currentWeightLbs: previousWeightLbs,
          lastCompletedWeightLbs: previousWeightLbs,
          consecutiveFailures: 0,
          lastEffortFeedback: outcome.effortFeedback,
          lastPerformedAt,
          repGoal: previousRepGoal,
          repRangeMin,
          repRangeMax
        };

        return {
          previousWeightLbs,
          nextWeightLbs: previousWeightLbs,
          previousRepGoal,
          nextRepGoal: previousRepGoal,
          result: "repeated",
          reason: "Repeated because this exercise has not been trained recently.",
          nextState
        };
      }
    }

    const recalibrationResult = this.calculateRecalibrationResultV2(input, previousWeightLbs);
    if (recalibrationResult) {
      return recalibrationResult;
    }

    if (outcome.effortFeedback === "too_hard") {
      const nextState: ProgressionStateSnapshotV2 = {
        currentWeightLbs: previousWeightLbs,
        lastCompletedWeightLbs: previousWeightLbs,
        consecutiveFailures: 0,
        lastEffortFeedback: outcome.effortFeedback,
        lastPerformedAt,
        repGoal: previousRepGoal,
        repRangeMin,
        repRangeMax
      };

      return {
        previousWeightLbs,
        nextWeightLbs: previousWeightLbs,
        previousRepGoal,
        nextRepGoal: previousRepGoal,
        result: "repeated",
        reason: "Repeated because effort was marked too hard.",
        nextState
      };
    }

    if (previousRepGoal < repRangeMax) {
      const increaseSteps =
        repRangeMax > repRangeMin ? getSuccessIncreaseStepCount(exercise.exerciseCategory, outcome.effortFeedback) : 1;
      const nextRepGoal = clampInteger(previousRepGoal + increaseSteps, repRangeMin, repRangeMax);
      const nextState: ProgressionStateSnapshotV2 = {
        currentWeightLbs: previousWeightLbs,
        lastCompletedWeightLbs: previousWeightLbs,
        consecutiveFailures: 0,
        lastEffortFeedback: outcome.effortFeedback,
        lastPerformedAt,
        repGoal: nextRepGoal,
        repRangeMin,
        repRangeMax
      };

      return {
        previousWeightLbs,
        nextWeightLbs: previousWeightLbs,
        previousRepGoal,
        nextRepGoal,
        result: "increased",
        reason: `Increased reps from ${previousRepGoal} to ${nextRepGoal} within range ${repRangeMin}–${repRangeMax}.`,
        nextState
      };
    }

    const increaseSteps =
      repRangeMax > repRangeMin ? getSuccessIncreaseStepCount(exercise.exerciseCategory, outcome.effortFeedback) : 1;
    const increaseLbs = roundToTwoDecimals(increaseSteps * exercise.incrementLbs);
    const nextWeightLbs = roundDownToIncrement(previousWeightLbs + increaseLbs, exercise.incrementLbs);
    const nextRepGoal = repRangeMin;
    const nextState: ProgressionStateSnapshotV2 = {
      currentWeightLbs: nextWeightLbs,
      lastCompletedWeightLbs: previousWeightLbs,
      consecutiveFailures: 0,
      lastEffortFeedback: outcome.effortFeedback,
      lastPerformedAt,
      repGoal: nextRepGoal,
      repRangeMin,
      repRangeMax
    };

    return {
      previousWeightLbs,
      nextWeightLbs,
      previousRepGoal,
      nextRepGoal,
      result: "increased",
      reason: `Increased weight from ${previousWeightLbs} to ${nextWeightLbs} and reset reps to ${repRangeMin}.`,
      nextState
    };
  }

  private calculateFixedWeight(input: ProgressionComputationInputV2): ProgressionComputationResultV2 {
    const { state, outcome, exercise } = input;

    const fixedRepGoal = state.repGoal;
    const repRangeMin = state.repRangeMin;
    const repRangeMax = state.repRangeMax;

    const base = this.calculate({
      ...(input.performedAt ? { performedAt: input.performedAt } : {}),
      state: {
        currentWeightLbs: state.currentWeightLbs,
        lastCompletedWeightLbs: state.lastCompletedWeightLbs,
        consecutiveFailures: state.consecutiveFailures,
        lastEffortFeedback: state.lastEffortFeedback,
        lastPerformedAt: state.lastPerformedAt ?? null
      },
      exercise,
      outcome: {
        effortFeedback: outcome.effortFeedback,
        ...(outcome.sets ? { sets: outcome.sets } : {}),
        ...(typeof outcome.hasFailure === "boolean" ? { hasFailure: outcome.hasFailure } : {})
      }
    });

    const nextState: ProgressionStateSnapshotV2 = {
      currentWeightLbs: base.nextState.currentWeightLbs,
      lastCompletedWeightLbs: base.nextState.lastCompletedWeightLbs,
      consecutiveFailures: base.nextState.consecutiveFailures,
      lastEffortFeedback: base.nextState.lastEffortFeedback,
      lastPerformedAt: base.nextState.lastPerformedAt ?? null,
      repGoal: fixedRepGoal,
      repRangeMin,
      repRangeMax
    };

    return {
      previousWeightLbs: base.previousWeightLbs,
      nextWeightLbs: base.nextWeightLbs,
      previousRepGoal: fixedRepGoal,
      nextRepGoal: fixedRepGoal,
      result: base.result,
      reason: base.reason,
      nextState
    };
  }

  private calculateBodyweightWeighted(input: ProgressionComputationInputV2): ProgressionComputationResultV2 {
    const { state, exercise } = input;

    if (exercise.isBodyweight && !exercise.isWeightOptional) {
      const previousWeightLbs = roundToTwoDecimals(state.currentWeightLbs);
      const previousRepGoal = state.repGoal;
      const repRangeMin = state.repRangeMin;
      const repRangeMax = state.repRangeMax;

      const nextState: ProgressionStateSnapshotV2 = {
        currentWeightLbs: previousWeightLbs,
        lastCompletedWeightLbs: state.lastCompletedWeightLbs,
        consecutiveFailures: state.consecutiveFailures,
        lastEffortFeedback: input.outcome.effortFeedback,
        lastPerformedAt: state.lastPerformedAt ?? null,
        repGoal: previousRepGoal,
        repRangeMin,
        repRangeMax
      };

      return {
        previousWeightLbs,
        nextWeightLbs: previousWeightLbs,
        previousRepGoal,
        nextRepGoal: previousRepGoal,
        result: "skipped",
        reason: `No progression because ${exercise.exerciseName} is a bodyweight movement and weighted progression is not enabled.`,
        nextState
      };
    }

    // Unlike double progression, allow progression to proceed when current external load is 0.
    const nextExercise = {
      ...exercise,
      isWeightOptional: false
    };

    return this.calculateDoubleProgression({
      ...input,
      exercise: nextExercise
    });
  }

  private calculateBodyweightReps(input: ProgressionComputationInputV2): ProgressionComputationResultV2 {
    const { exercise, outcome, state } = input;

    const previousWeightLbs = roundToTwoDecimals(state.currentWeightLbs);
    const previousRepGoal = state.repGoal;
    const repRangeMin = state.repRangeMin;
    const repRangeMax = state.repRangeMax;
    const lastPerformedAt = state.lastPerformedAt ?? null;

    if (!Number.isInteger(previousRepGoal) || !Number.isInteger(repRangeMin) || !Number.isInteger(repRangeMax)) {
      throw new Error("repGoal, repRangeMin, and repRangeMax must be integers.");
    }

    if (repRangeMin <= 0) {
      throw new Error("repRangeMin must be greater than 0.");
    }

    if (repRangeMax < repRangeMin) {
      throw new Error("repRangeMax must be greater than or equal to repRangeMin.");
    }

    if (previousRepGoal < repRangeMin || previousRepGoal > repRangeMax) {
      throw new Error("repGoal must be within the rep range.");
    }

    if (!outcome.sets || outcome.sets.length === 0) {
      throw new Error("bodyweight_reps requires per-set outcomes.");
    }

    if (exercise.isBodyweight && exercise.isWeightOptional && previousWeightLbs > 0) {
      // If the user is logging external load, steer them toward bodyweight_weighted.
      const nextState: ProgressionStateSnapshotV2 = {
        currentWeightLbs: previousWeightLbs,
        lastCompletedWeightLbs: state.lastCompletedWeightLbs,
        consecutiveFailures: state.consecutiveFailures,
        lastEffortFeedback: outcome.effortFeedback,
        lastPerformedAt,
        repGoal: previousRepGoal,
        repRangeMin,
        repRangeMax
      };

      return {
        previousWeightLbs,
        nextWeightLbs: previousWeightLbs,
        previousRepGoal,
        nextRepGoal: previousRepGoal,
        result: "skipped",
        reason: `No reps-only progression because ${exercise.exerciseName} is tracking external load; use bodyweight_weighted instead.`,
        nextState
      };
    }

    const hasBelowRangeMin = outcome.sets.some(
      (set) => (set.actualReps ?? 0) < repRangeMin && !isMaterialOverperformanceSet(set)
    );
    if (hasBelowRangeMin) {
      const nextFailureCount = state.consecutiveFailures + 1;
      if (nextFailureCount >= 2) {
        const nextRepGoal = repRangeMin;
        const nextState: ProgressionStateSnapshotV2 = {
          currentWeightLbs: previousWeightLbs,
          lastCompletedWeightLbs: state.lastCompletedWeightLbs,
          consecutiveFailures: 0,
          lastEffortFeedback: outcome.effortFeedback,
          lastPerformedAt,
          repGoal: nextRepGoal,
          repRangeMin,
          repRangeMax
        };

        return {
          previousWeightLbs,
          nextWeightLbs: previousWeightLbs,
          previousRepGoal,
          nextRepGoal,
          result: "reduced",
          reason: "Reduced reps after consecutive failures and reset to the bottom of the range.",
          nextState
        };
      }

      const nextState: ProgressionStateSnapshotV2 = {
        currentWeightLbs: previousWeightLbs,
        lastCompletedWeightLbs: state.lastCompletedWeightLbs,
        consecutiveFailures: nextFailureCount,
        lastEffortFeedback: outcome.effortFeedback,
        lastPerformedAt,
        repGoal: previousRepGoal,
        repRangeMin,
        repRangeMax
      };

      return {
        previousWeightLbs,
        nextWeightLbs: previousWeightLbs,
        previousRepGoal,
        nextRepGoal: previousRepGoal,
        result: "repeated",
        reason: "Repeated because reps were below the target range minimum.",
        nextState
      };
    }

    const metRepGoal = outcome.sets.every(
      (set) => (set.actualReps ?? 0) >= previousRepGoal || isMaterialOverperformanceSet(set)
    );
    if (!metRepGoal) {
      const nextState: ProgressionStateSnapshotV2 = {
        currentWeightLbs: previousWeightLbs,
        lastCompletedWeightLbs: state.lastCompletedWeightLbs,
        consecutiveFailures: 0,
        lastEffortFeedback: outcome.effortFeedback,
        lastPerformedAt,
        repGoal: previousRepGoal,
        repRangeMin,
        repRangeMax
      };

      return {
        previousWeightLbs,
        nextWeightLbs: previousWeightLbs,
        previousRepGoal,
        nextRepGoal: previousRepGoal,
        result: "repeated",
        reason: `Repeated because reps were below the current rep goal of ${previousRepGoal} within range ${repRangeMin}–${repRangeMax}.`,
        nextState
      };
    }

    if (outcome.effortFeedback === "too_hard") {
      const nextState: ProgressionStateSnapshotV2 = {
        currentWeightLbs: previousWeightLbs,
        lastCompletedWeightLbs: previousWeightLbs,
        consecutiveFailures: 0,
        lastEffortFeedback: outcome.effortFeedback,
        lastPerformedAt,
        repGoal: previousRepGoal,
        repRangeMin,
        repRangeMax
      };

      return {
        previousWeightLbs,
        nextWeightLbs: previousWeightLbs,
        previousRepGoal,
        nextRepGoal: previousRepGoal,
        result: "repeated",
        reason: "Repeated because effort was marked too hard.",
        nextState
      };
    }

    if (previousRepGoal < repRangeMax) {
      const increaseSteps =
        repRangeMax > repRangeMin ? getSuccessIncreaseStepCount(exercise.exerciseCategory, outcome.effortFeedback) : 1;
      const nextRepGoal = clampInteger(previousRepGoal + increaseSteps, repRangeMin, repRangeMax);
      const nextState: ProgressionStateSnapshotV2 = {
        currentWeightLbs: previousWeightLbs,
        lastCompletedWeightLbs: previousWeightLbs,
        consecutiveFailures: 0,
        lastEffortFeedback: outcome.effortFeedback,
        lastPerformedAt,
        repGoal: nextRepGoal,
        repRangeMin,
        repRangeMax
      };

      return {
        previousWeightLbs,
        nextWeightLbs: previousWeightLbs,
        previousRepGoal,
        nextRepGoal,
        result: "increased",
        reason: `Increased reps from ${previousRepGoal} to ${nextRepGoal} within range ${repRangeMin}–${repRangeMax}.`,
        nextState
      };
    }

    const nextState: ProgressionStateSnapshotV2 = {
      currentWeightLbs: previousWeightLbs,
      lastCompletedWeightLbs: previousWeightLbs,
      consecutiveFailures: 0,
      lastEffortFeedback: outcome.effortFeedback,
      lastPerformedAt,
      repGoal: previousRepGoal,
      repRangeMin,
      repRangeMax
    };

    return {
      previousWeightLbs,
      nextWeightLbs: previousWeightLbs,
      previousRepGoal,
      nextRepGoal: previousRepGoal,
      result: "repeated",
      reason: `Repeated because reps are already at the top of the range ${repRangeMin}–${repRangeMax}.`,
      nextState
    };
  }

  private calculateFailureResult(
    input: ProgressionComputationInput,
    previousWeightLbs: number
  ): ProgressionComputationResult {
    const { exercise, outcome, state } = input;

    if (state.consecutiveFailures >= 1) {
      const attemptedDeloadWeight = roundToTwoDecimals(previousWeightLbs * 0.9);
      let nextWeightLbs = roundDownToIncrement(attemptedDeloadWeight, exercise.incrementLbs);

      if (nextWeightLbs === previousWeightLbs) {
        nextWeightLbs = roundToTwoDecimals(Math.max(0, previousWeightLbs - exercise.incrementLbs));
      }

      const nextState: ProgressionStateSnapshot = {
        currentWeightLbs: nextWeightLbs,
        lastCompletedWeightLbs: state.lastCompletedWeightLbs,
        consecutiveFailures: 0,
        lastEffortFeedback: outcome.effortFeedback
      };

      return {
        previousWeightLbs,
        nextWeightLbs,
        result: "reduced",
        reason: `Reduced from ${previousWeightLbs} lb to ${nextWeightLbs} lb after two consecutive failed workouts (10% deload).`,
        nextState
      };
    }

    const nextState: ProgressionStateSnapshot = {
      currentWeightLbs: previousWeightLbs,
      lastCompletedWeightLbs: state.lastCompletedWeightLbs,
      consecutiveFailures: state.consecutiveFailures + 1,
      lastEffortFeedback: outcome.effortFeedback
    };

    return {
      previousWeightLbs,
      nextWeightLbs: previousWeightLbs,
      result: "repeated",
      reason: `Repeated ${previousWeightLbs} lb because at least one set missed the prescribed reps.`,
      nextState
    };
  }

  private calculateFailureResultV2(
    input: ProgressionComputationInputV2,
    previousWeightLbs: number
  ): ProgressionComputationResultV2 {
    const { exercise, outcome, state } = input;

    const previousRepGoal = state.repGoal;
    const repRangeMin = state.repRangeMin;
    const repRangeMax = state.repRangeMax;

    const nextFailureCount = state.consecutiveFailures + 1;

    if (nextFailureCount >= 2) {
      const nextWeightLbs = roundDownToIncrement(
        Math.max(0, previousWeightLbs - exercise.incrementLbs),
        exercise.incrementLbs
      );
      const nextRepGoal = repRangeMin;

      const nextState: ProgressionStateSnapshotV2 = {
        currentWeightLbs: nextWeightLbs,
        lastCompletedWeightLbs: state.lastCompletedWeightLbs,
        consecutiveFailures: 0,
        lastEffortFeedback: outcome.effortFeedback,
        repGoal: nextRepGoal,
        repRangeMin,
        repRangeMax
      };

      return {
        previousWeightLbs,
        nextWeightLbs,
        previousRepGoal,
        nextRepGoal,
        result: "reduced",
        reason: "Reduced weight after consecutive failures and reset reps to the bottom of the range.",
        nextState
      };
    }

    const nextState: ProgressionStateSnapshotV2 = {
      currentWeightLbs: previousWeightLbs,
      lastCompletedWeightLbs: state.lastCompletedWeightLbs,
      consecutiveFailures: nextFailureCount,
      lastEffortFeedback: outcome.effortFeedback,
      repGoal: previousRepGoal,
      repRangeMin,
      repRangeMax
    };

    return {
      previousWeightLbs,
      nextWeightLbs: previousWeightLbs,
      previousRepGoal,
      nextRepGoal: previousRepGoal,
      result: "repeated",
      reason: "Repeated because reps were below the target range minimum.",
      nextState
    };
  }

  private calculateSuccessResult(
    input: ProgressionComputationInput,
    previousWeightLbs: number
  ): ProgressionComputationResult {
    const { exercise, outcome } = input;

    if (outcome.effortFeedback === "too_hard") {
      const nextState: ProgressionStateSnapshot = {
        currentWeightLbs: previousWeightLbs,
        lastCompletedWeightLbs: previousWeightLbs,
        consecutiveFailures: 0,
        lastEffortFeedback: outcome.effortFeedback
      };

      return {
        previousWeightLbs,
        nextWeightLbs: previousWeightLbs,
        result: "repeated",
        reason: `Repeated ${previousWeightLbs} lb because the work was completed but effort was marked too hard.`,
        nextState
      };
    }

    const increaseSteps = getSuccessIncreaseStepCount(exercise.exerciseCategory, outcome.effortFeedback);
    const increaseLbs = roundToTwoDecimals(increaseSteps * exercise.incrementLbs);

    const nextWeightLbs = roundDownToIncrement(previousWeightLbs + increaseLbs, exercise.incrementLbs);
    const nextState: ProgressionStateSnapshot = {
      currentWeightLbs: nextWeightLbs,
      lastCompletedWeightLbs: previousWeightLbs,
      consecutiveFailures: 0,
      lastEffortFeedback: outcome.effortFeedback
    };

    return {
      previousWeightLbs,
      nextWeightLbs,
      result: "increased",
      reason:
        outcome.effortFeedback === "too_easy"
          ? `Increased from ${previousWeightLbs} lb to ${nextWeightLbs} lb because all sets were completed and effort was marked too easy.`
          : `Increased from ${previousWeightLbs} lb to ${nextWeightLbs} lb because all sets were completed and effort was marked manageable.`,
      nextState
    };
  }

  private calculateRecalibrationResult(
    input: ProgressionComputationInput,
    previousWeightLbs: number
  ): ProgressionComputationResult | null {
    const { exercise, outcome } = input;
    const qualifyingSets = outcome.sets?.filter(isMaterialOverperformanceSet) ?? [];

    if (qualifyingSets.length < MIN_RECALIBRATION_SET_COUNT) {
      return null;
    }

    const estimatedOneRepMaxes = qualifyingSets.map((set) =>
      estimateOneRepMaxEpley(set.actualWeightLbs!, set.actualReps!)
    );
    const targetRepCounts = qualifyingSets.map((set) => set.targetReps);
    const representativeE1rm = median(estimatedOneRepMaxes);
    const representativeTargetReps = median(targetRepCounts);
    const uncappedWorkingWeight = estimateWorkingWeightFromOneRepMax(
      representativeE1rm,
      representativeTargetReps
    );
    const cappedWorkingWeight = Math.min(
      uncappedWorkingWeight,
      previousWeightLbs * MAX_RECALIBRATION_JUMP_MULTIPLIER
    );
    const nextWeightLbs = roundDownToIncrement(cappedWorkingWeight, exercise.incrementLbs);

    const tooEasyIncreaseCap = roundToTwoDecimals(2 * exercise.incrementLbs);
    if (nextWeightLbs <= previousWeightLbs + tooEasyIncreaseCap) {
      return null;
    }

    const nextState: ProgressionStateSnapshot = {
      currentWeightLbs: nextWeightLbs,
      lastCompletedWeightLbs: nextWeightLbs,
      consecutiveFailures: 0,
      lastEffortFeedback: outcome.effortFeedback
    };

    return {
      previousWeightLbs,
      nextWeightLbs,
      result: "recalibrated",
      reason: `Recalibrated from ${previousWeightLbs} lb to ${nextWeightLbs} lb based on materially heavier sets logged.`,
      nextState
    };
  }

  private calculateRecalibrationResultV2(
    input: ProgressionComputationInputV2,
    previousWeightLbs: number
  ): ProgressionComputationResultV2 | null {
    const { exercise, outcome, state } = input;
    const qualifyingSets = outcome.sets?.filter(isMaterialOverperformanceSet) ?? [];

    if (qualifyingSets.length < MIN_RECALIBRATION_SET_COUNT) {
      return null;
    }

    const estimatedOneRepMaxes = qualifyingSets.map((set) =>
      estimateOneRepMaxEpley(set.actualWeightLbs!, set.actualReps!)
    );
    const targetRepCounts = qualifyingSets.map((set) => set.targetReps);
    const representativeE1rm = median(estimatedOneRepMaxes);
    const representativeTargetReps = median(targetRepCounts);
    const uncappedWorkingWeight = estimateWorkingWeightFromOneRepMax(
      representativeE1rm,
      representativeTargetReps
    );
    const cappedWorkingWeight = Math.min(
      uncappedWorkingWeight,
      previousWeightLbs * MAX_RECALIBRATION_JUMP_MULTIPLIER
    );
    const nextWeightLbs = roundDownToIncrement(cappedWorkingWeight, exercise.incrementLbs);

    const tooEasyIncreaseCap = roundToTwoDecimals(2 * exercise.incrementLbs);
    if (nextWeightLbs <= previousWeightLbs + tooEasyIncreaseCap) {
      return null;
    }

    const repRangeMin = state.repRangeMin;
    const repRangeMax = state.repRangeMax;
    const previousRepGoal = state.repGoal;
    const nextRepGoal = clampInteger(previousRepGoal, repRangeMin, repRangeMax);

    const nextState: ProgressionStateSnapshotV2 = {
      currentWeightLbs: nextWeightLbs,
      lastCompletedWeightLbs: nextWeightLbs,
      consecutiveFailures: 0,
      lastEffortFeedback: outcome.effortFeedback,
      repGoal: nextRepGoal,
      repRangeMin,
      repRangeMax
    };

    return {
      previousWeightLbs,
      nextWeightLbs,
      previousRepGoal,
      nextRepGoal,
      result: "recalibrated",
      reason: `Recalibrated from ${previousWeightLbs} lb to ${nextWeightLbs} lb based on materially heavier sets logged.`,
      nextState
    };
  }
}
