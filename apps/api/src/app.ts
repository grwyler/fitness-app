import cors from "cors";
import express, { type NextFunction, type Request, type Response, type Router } from "express";
import { healthRouter } from "./modules/health/health.routes.js";
import { failure } from "./lib/http/envelope.js";
import { isAppError } from "./lib/http/errors.js";
import { toAppError } from "./modules/workout/http/workout.http-errors.js";

export function createApp(options?: { workoutRouter?: Router }) {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.use("/api/v1", healthRouter);
  if (options?.workoutRouter) {
    app.use("/api/v1", options.workoutRouter);
  }

  app.use((_request, response) => {
    response.status(404).json(failure("NOT_FOUND", "Route not found."));
  });

  app.use((error: unknown, _request: Request, response: Response, _next: NextFunction) => {
    const appError = isAppError(error) ? error : toAppError(error);
    if (isAppError(appError)) {
      response.status(appError.statusCode).json(failure(appError.code, appError.message, appError.details));
      return;
    }

    response.status(500).json(failure("INTERNAL_ERROR", "Unexpected backend error."));
  });

  return app;
}
