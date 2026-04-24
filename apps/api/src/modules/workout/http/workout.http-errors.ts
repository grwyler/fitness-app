import { ZodError } from "zod";
import { AppError } from "../../../lib/http/errors.js";
import { WorkoutApplicationError } from "../application/errors/workout-application.error.js";
import { WorkoutDomainError } from "../domain/errors/workout-domain.error.js";

export function toAppError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error;
  }

  if (error instanceof ZodError) {
    return new AppError(
      400,
      "VALIDATION_ERROR",
      "Request validation failed.",
      error.issues.map((issue) => {
        const field = issue.path.join(".");
        return field
          ? {
              field,
              message: issue.message
            }
          : {
              message: issue.message
            };
      })
    );
  }

  if (error instanceof WorkoutApplicationError) {
    switch (error.code) {
      case "SESSION_NOT_FOUND":
      case "SET_NOT_FOUND":
      case "WORKOUT_TEMPLATE_NOT_FOUND":
        return new AppError(404, "NOT_FOUND", error.message);
      case "ACTIVE_WORKOUT_ALREADY_EXISTS":
      case "IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_PAYLOAD":
        return new AppError(409, "CONFLICT", error.message);
      case "IDEMPOTENCY_REQUEST_IN_PROGRESS":
        return new AppError(409, "CONFLICT", error.message);
      default:
        return new AppError(409, "BUSINESS_RULE_VIOLATION", error.message);
    }
  }

  if (error instanceof WorkoutDomainError) {
    switch (error.code) {
      case "UNKNOWN_EXERCISE_ENTRY":
        return new AppError(404, "NOT_FOUND", error.message);
      default:
        return new AppError(409, "BUSINESS_RULE_VIOLATION", error.message);
    }
  }

  return new AppError(500, "INTERNAL_ERROR", "Unexpected backend error.");
}
