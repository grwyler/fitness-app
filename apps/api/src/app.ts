import cors, { type CorsOptions } from "cors";
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
import { createRequestContextMiddleware } from "./lib/auth/request-context.middleware.js";
import { createProtectedAuthRouter, createPublicAuthRouter } from "./lib/auth/auth.routes.js";
import { env } from "./config/env.js";
import { createDevResetRouter } from "./modules/dev/reset-test-user-data.routes.js";

type DatabaseLike = {
  select: (...args: any[]) => any;
  insert: (...args: any[]) => any;
  transaction: <T>(operation: (tx: any) => Promise<T>) => Promise<T>;
};

const defaultAllowedOrigins = [
  "http://localhost:8081",
  "http://127.0.0.1:8081",
  "https://setwisefit.vercel.app"
];

function resolveAllowedOrigins() {
  const configuredOrigins =
    env.CORS_ALLOWED_ORIGINS?.split(",")
      .map((origin) => origin.trim())
      .filter(Boolean) ?? [];

  return new Set([...defaultAllowedOrigins, ...configuredOrigins]);
}

export function createCorsOptions(): CorsOptions {
  const allowedOrigins = resolveAllowedOrigins();

  return {
    allowedHeaders: ["Authorization", "Content-Type", "Idempotency-Key", "Accept"],
    credentials: true,
    methods: ["GET", "POST", "OPTIONS"],
    optionsSuccessStatus: 204,
    origin(origin, callback) {
      if (!origin || allowedOrigins.has(origin)) {
        callback(null, true);
        return;
      }

      callback(null, false);
    }
  };
}

export function createApp(options?: {
  auth?: {
    authenticateRequest?: RequestHandler;
  };
  database?: DatabaseLike;
  workoutRouter?: Router;
}) {
  const app = express();

  app.use(cors(createCorsOptions()));
  app.use(express.json());

  app.use(healthRouter);
  app.use("/api/v1", healthRouter);
  if (options?.workoutRouter) {
    if (options.database) {
      const authenticateRequest = options.auth?.authenticateRequest ?? createAuthenticateRequestMiddleware();

      app.use("/api/v1", createPublicAuthRouter(options.database));
      app.use("/api/v1", authenticateRequest);
      app.use("/api/v1", createProtectedAuthRouter(options.database));
      app.use(
        "/api/v1",
        createRequestContextMiddleware({
          database: options.database
        })
      );
      app.use("/api/v1", createDevResetRouter(options.database));
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
