import type { ExerciseCategory } from "@fitness/shared";
import type {
  ProgressionComputationInput,
  ProgressionComputationResult,
  ProgressionStateSnapshot,
  ExerciseWorkoutOutcome,
  ExerciseWorkoutSetOutcome
} from "../models/progression.js";

export const MATERIAL_OVERPERFORMANCE_MULTIPLIER = 1.25;
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

function getStandardIncreaseLbs(category: ExerciseCategory) {
  return category === "compound" ? 5 : 2.5;
}

function getTooEasyIncreaseLbs(category: ExerciseCategory) {
  return category === "compound" ? 10 : 5;
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

    const recalibrationResult = this.calculateRecalibrationResult(input, previousWeightLbs);
    if (recalibrationResult) {
      return recalibrationResult;
    }

    if (hasEffectiveFailure(outcome)) {
      return this.calculateFailureResult(input, previousWeightLbs);
    }

    return this.calculateSuccessResult(input, previousWeightLbs);
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
        reason: `${exercise.exerciseName} failed twice consecutively. Applying a 10% deload.`,
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
      reason: `${exercise.exerciseName} had at least one failed set. Repeating the same weight.`,
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
        reason: `${exercise.exerciseName} was completed but felt too hard. Repeating the same weight.`,
        nextState
      };
    }

    const increaseLbs =
      outcome.effortFeedback === "too_easy"
        ? getTooEasyIncreaseLbs(exercise.exerciseCategory)
        : getStandardIncreaseLbs(exercise.exerciseCategory);

    const nextWeightLbs = roundToTwoDecimals(previousWeightLbs + increaseLbs);
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
          ? `${exercise.exerciseName} was completed and felt too easy. Increasing weight aggressively.`
          : `${exercise.exerciseName} was completed successfully. Increasing to the next planned weight.`,
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

    if (nextWeightLbs <= previousWeightLbs + getTooEasyIncreaseLbs(exercise.exerciseCategory)) {
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
      reason: `Adjusted ${exercise.exerciseName} working weight based on your performance.`,
      nextState
    };
  }
}
