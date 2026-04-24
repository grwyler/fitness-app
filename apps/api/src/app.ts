import cors from "cors";
import express, { type NextFunction, type Request, type Response } from "express";
import { healthRouter } from "./modules/health/health.routes.js";
import { failure } from "./lib/http/envelope.js";
import { isAppError } from "./lib/http/errors.js";

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.use("/api/v1", healthRouter);

  app.use((_request, response) => {
    response.status(404).json(failure("NOT_FOUND", "Route not found."));
  });

  app.use((error: unknown, _request: Request, response: Response, _next: NextFunction) => {
    if (isAppError(error)) {
      response.status(error.statusCode).json(failure(error.code, error.message, error.details));
      return;
    }

    response.status(500).json(failure("INTERNAL_ERROR", "Unexpected backend error."));
  });

  return app;
}

