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

const productionAllowedOrigins = ["https://setwisefit.vercel.app"];
const developmentAllowedOrigins = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:8081",
  "http://127.0.0.1:8081"
];

function isPrivateNetworkOrigin(origin: string) {
  if (!/^http:\/\//i.test(origin)) {
    return false;
  }

  try {
    const url = new URL(origin);
    const hostname = url.hostname;

    if (hostname === "localhost" || hostname === "127.0.0.1") {
      return true;
    }

    if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname)) {
      return true;
    }

    if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(hostname)) {
      return true;
    }

    const match172 = hostname.match(/^172\.(\d{1,2})\.\d{1,3}\.\d{1,3}$/);
    if (match172) {
      const block = Number(match172[1]);
      return Number.isFinite(block) && block >= 16 && block <= 31;
    }

    return false;
  } catch {
    return false;
  }
}

function resolveAllowedOrigins() {
  const defaultAllowedOrigins =
    env.NODE_ENV === "production"
      ? productionAllowedOrigins
      : [...developmentAllowedOrigins, ...productionAllowedOrigins];
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
    methods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    optionsSuccessStatus: 200,
    preflightContinue: true,
    origin(origin, callback) {
      if (!origin || allowedOrigins.has(origin)) {
        callback(null, true);
        return;
      }

      if (env.NODE_ENV !== "production" && isPrivateNetworkOrigin(origin)) {
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
  feedbackRouter?: Router;
}) {
  const resolvedOptions = options ?? {};
  const app = express();
  const corsOptions = createCorsOptions();

  app.use(cors(corsOptions));
  app.use((request, response, next) => {
    if (request.method === "OPTIONS") {
      response.status(200).end();
      return;
    }

    next();
  });
  app.use(express.json());

  app.use(healthRouter);
  app.use("/api/v1", healthRouter);

  const hasApiRouters = Boolean(resolvedOptions.workoutRouter || resolvedOptions.feedbackRouter);

  if (hasApiRouters) {
    if (resolvedOptions.database) {
      const authenticateRequest = resolvedOptions.auth?.authenticateRequest ?? createAuthenticateRequestMiddleware();

      app.use("/api/v1", createPublicAuthRouter(resolvedOptions.database));
      app.use("/api/v1", authenticateRequest);
      app.use("/api/v1", createProtectedAuthRouter(resolvedOptions.database));
      app.use(
        "/api/v1",
        createRequestContextMiddleware({
          database: resolvedOptions.database
        })
      );
      app.use("/api/v1", createDevResetRouter(resolvedOptions.database));
    }

    if (resolvedOptions.workoutRouter) {
      app.use("/api/v1", resolvedOptions.workoutRouter);
    }

    if (resolvedOptions.feedbackRouter) {
      app.use("/api/v1", resolvedOptions.feedbackRouter);
    }
  }

  app.use((_request, response) => {
    response.status(404).json(failure("NOT_FOUND", "Route not found."));
  });

  app.use((error: unknown, request: Request, response: Response, _next: NextFunction) => {
    const appError = isAppError(error) ? error : toAppError(error);
    if (isAppError(appError)) {
      if (appError.statusCode >= 500) {
        const requestContext = request.context as { userId?: string } | undefined;
        const routeContext = {
          method: request.method,
          path: request.originalUrl,
          userId: requestContext?.userId
        };
        errorReporter.captureException(error, {
          code: appError.code,
          statusCode: appError.statusCode,
          ...routeContext
        });
        logger.error("Unhandled API error", {
          code: appError.code,
          statusCode: appError.statusCode,
          ...routeContext
        });
      }

      response.status(appError.statusCode).json(failure(appError.code, appError.message, appError.details));
      return;
    }

    errorReporter.captureException(error);
    logger.error("Unexpected API error", {
      method: request.method,
      path: request.originalUrl,
      userId: (request.context as { userId?: string } | undefined)?.userId
    });
    response.status(500).json(failure("INTERNAL_ERROR", "Unexpected backend error."));
  });

  return app;
}
