import cors from "cors";
import { clerkClient, clerkMiddleware, getAuth } from "@clerk/express";
import express, {
  type NextFunction,
  type Request,
  type RequestHandler,
  type Response,
  type Router
} from "express";
import { healthRouter } from "./modules/health/health.routes.js";
import { failure } from "./lib/http/envelope.js";
import { isAppError } from "./lib/http/errors.js";
import { errorReporter } from "./lib/observability/error-reporter.js";
import { logger } from "./lib/observability/logger.js";
import { toAppError } from "./modules/workout/http/workout.http-errors.js";
import { createAuthenticateRequestMiddleware } from "./lib/auth/auth.middleware.js";
import type { ClerkAuthGetter, ClerkClientLike } from "./lib/auth/auth.types.js";
import { createRequestContextMiddleware } from "./lib/auth/request-context.middleware.js";

type DatabaseLike = {
  select: (...args: any[]) => any;
  insert: (...args: any[]) => any;
};

export function createApp(options?: {
  auth?: {
    clerkClient?: ClerkClientLike;
    clerkGetAuth?: ClerkAuthGetter;
    clerkMiddleware?: () => RequestHandler;
  };
  database?: DatabaseLike;
  workoutRouter?: Router;
}) {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.use(healthRouter);
  app.use("/api/v1", healthRouter);
  if (options?.workoutRouter) {
    if (options.database) {
      const authMiddlewareFactory = options.auth?.clerkMiddleware ?? clerkMiddleware;
      const authClient = options.auth?.clerkClient ?? clerkClient;
      const authGetter = options.auth?.clerkGetAuth ?? getAuth;

      app.use("/api/v1", authMiddlewareFactory());
      app.use("/api/v1", createAuthenticateRequestMiddleware(authGetter));
      app.use(
        "/api/v1",
        createRequestContextMiddleware({
          clerkClient: authClient,
          database: options.database
        })
      );
    }

    app.use("/api/v1", options.workoutRouter);
  }

  app.use((_request, response) => {
    response.status(404).json(failure("NOT_FOUND", "Route not found."));
  });

  app.use((error: unknown, _request: Request, response: Response, _next: NextFunction) => {
    const appError = isAppError(error) ? error : toAppError(error);
    if (isAppError(appError)) {
      if (appError.statusCode >= 500) {
        errorReporter.captureException(error, {
          code: appError.code,
          statusCode: appError.statusCode
        });
        logger.error("Unhandled API error", {
          code: appError.code,
          statusCode: appError.statusCode
        });
      }

      response.status(appError.statusCode).json(failure(appError.code, appError.message, appError.details));
      return;
    }

    errorReporter.captureException(error);
    logger.error("Unexpected API error");
    response.status(500).json(failure("INTERNAL_ERROR", "Unexpected backend error."));
  });

  return app;
}
