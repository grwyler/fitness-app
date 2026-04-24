import type { ExerciseCategory } from "@fitness/shared";
import type {
  ProgressionComputationInput,
  ProgressionComputationResult,
  ProgressionStateSnapshot
} from "../models/progression.js";

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

    if (outcome.hasFailure) {
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
}

