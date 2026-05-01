import { MATERIAL_OVERPERFORMANCE_MULTIPLIER, type ExerciseCategory } from "@fitness/shared";
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
  public calculate(input: ProgressionComputationInput): ProgressionComputationResult {
    const { exercise, outcome, state } = input;
    const previousWeightLbs = roundToTwoDecimals(state.currentWeightLbs);

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

    const recalibrationResult = this.calculateRecalibrationResult(input, previousWeightLbs);
    if (recalibrationResult) {
      return recalibrationResult;
    }

    if (hasEffectiveFailure(outcome)) {
      return this.calculateFailureResult(input, previousWeightLbs);
    }

    return this.calculateSuccessResult(input, previousWeightLbs);
  }

  public calculateDoubleProgression(input: ProgressionComputationInputV2): ProgressionComputationResultV2 {
    const { exercise, outcome, state } = input;

    const previousWeightLbs = roundToTwoDecimals(state.currentWeightLbs);
    const previousRepGoal = state.repGoal;
    const repRangeMin = state.repRangeMin;
    const repRangeMax = state.repRangeMax;

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

    const recalibrationResult = this.calculateRecalibrationResultV2(input, previousWeightLbs);
    if (recalibrationResult) {
      return recalibrationResult;
    }

    const hasBelowRangeMin = outcome.sets.some((set) => (set.actualReps ?? 0) < repRangeMin);
    if (hasBelowRangeMin) {
      return this.calculateFailureResultV2(input, previousWeightLbs);
    }

    const metRepGoal = outcome.sets.every((set) => (set.actualReps ?? 0) >= previousRepGoal);
    if (!metRepGoal) {
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
      const nextRepGoal = previousRepGoal + 1;
      const nextState: ProgressionStateSnapshotV2 = {
        currentWeightLbs: previousWeightLbs,
        lastCompletedWeightLbs: previousWeightLbs,
        consecutiveFailures: 0,
        lastEffortFeedback: outcome.effortFeedback,
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

    const nextWeightLbs = roundDownToIncrement(previousWeightLbs + exercise.incrementLbs, exercise.incrementLbs);
    const nextRepGoal = repRangeMin;
    const nextState: ProgressionStateSnapshotV2 = {
      currentWeightLbs: nextWeightLbs,
      lastCompletedWeightLbs: previousWeightLbs,
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
      result: "increased",
      reason: `Increased weight from ${previousWeightLbs} to ${nextWeightLbs} and reset reps to ${repRangeMin}.`,
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
