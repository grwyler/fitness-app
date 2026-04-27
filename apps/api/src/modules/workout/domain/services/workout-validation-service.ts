import { WorkoutDomainError } from "../errors/workout-domain.error.js";
import type {
  LogSetValidationInput,
  WorkoutCompletionValidationInput
} from "../models/validation.js";

export class WorkoutValidationService {
  public assertSetCanBeLogged(input: LogSetValidationInput) {
    if (input.workoutSessionStatus !== "in_progress") {
      throw new WorkoutDomainError(
        "INVALID_SESSION_STATUS",
        "Sets can only be logged for an in-progress workout session."
      );
    }

    if (input.setStatus !== "pending") {
      throw new WorkoutDomainError("SET_ALREADY_LOGGED", "Only pending sets can be logged.");
    }
  }

  public assertWorkoutCanBeCompleted(input: WorkoutCompletionValidationInput) {
    if (input.workoutSessionStatus !== "in_progress") {
      throw new WorkoutDomainError(
        "INVALID_SESSION_STATUS",
        "Only in-progress workout sessions can be completed."
      );
    }

    for (const exercise of input.exercises) {
      const hasIncompleteSets = exercise.setStatuses.some(
        (status) => status === "pending" || status === "skipped"
      );
      if (hasIncompleteSets && !input.allowPartialCompletion) {
        throw new WorkoutDomainError(
          "INCOMPLETE_WORKOUT",
          `Exercise entry ${exercise.exerciseEntryId} still has incomplete sets.`
        );
      }

      if (hasIncompleteSets) {
        continue;
      }

      const feedback = input.exerciseFeedback[exercise.exerciseEntryId];
      if (!feedback) {
        throw new WorkoutDomainError(
          "MISSING_EFFORT_FEEDBACK",
          `Exercise entry ${exercise.exerciseEntryId} is missing effort feedback.`
        );
      }
    }
  }
}
