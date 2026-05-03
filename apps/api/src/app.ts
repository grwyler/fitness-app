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
import { describeErrorForLogs } from "./lib/observability/describe-error.js";
import { initApiObservability } from "./lib/observability/init.js";
import { toAppError } from "./modules/workout/http/workout.http-errors.js";
import { createAuthenticateRequestMiddleware } from "./lib/auth/auth.middleware.js";
import { createRequestContextMiddleware } from "./lib/auth/request-context.middleware.js";
import { createProtectedAuthRouter, createPublicAuthRouter } from "./lib/auth/auth.routes.js";
import { getEnv, type AppEnv } from "./config/env.js";
import { createRequestIdMiddleware } from "./lib/http/request-id.middleware.js";

type DatabaseLike = {
  select: (...args: any[]) => any;
  insert: (...args: any[]) => any;
  update: (...args: any[]) => any;
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

function resolveAllowedOrigins(env: AppEnv) {
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

export function createCorsOptions(env: AppEnv = getEnv()): CorsOptions {
  const allowedOrigins = resolveAllowedOrigins(env);

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
  adminRouter?: Router;
}) {
  const resolvedOptions = options ?? {};
  const app = express();
  const env = getEnv();
  const corsOptions = createCorsOptions(env);

  initApiObservability();

  app.set("trust proxy", env.VERCEL === "1" ? 1 : false);

  app.use(cors(corsOptions));
  app.use(createRequestIdMiddleware());
  app.use((request, response, next) => {
    if (request.method === "OPTIONS") {
      response.status(200).end();
      return;
    }

    next();
  });
  app.use(express.json());

  if (resolvedOptions.database) {
    app.locals.database = resolvedOptions.database;
  }

  app.use(healthRouter);
  app.use("/api/v1", healthRouter);

  const hasApiRouters = Boolean(
    resolvedOptions.workoutRouter || resolvedOptions.feedbackRouter || resolvedOptions.adminRouter
  );

  if (hasApiRouters) {
    if (resolvedOptions.database) {
      const authenticateRequest =
        resolvedOptions.auth?.authenticateRequest ??
        createAuthenticateRequestMiddleware({ database: resolvedOptions.database });

      app.use("/api/v1", createPublicAuthRouter(resolvedOptions.database));
      app.use("/api/v1", authenticateRequest);
      app.use("/api/v1", createProtectedAuthRouter(resolvedOptions.database));
      app.use(
        "/api/v1",
        createRequestContextMiddleware({
          database: resolvedOptions.database
        })
      );
    }

    if (resolvedOptions.workoutRouter) {
      app.use("/api/v1", resolvedOptions.workoutRouter);
    }

    if (resolvedOptions.feedbackRouter) {
      app.use("/api/v1", resolvedOptions.feedbackRouter);
    }

    if (resolvedOptions.adminRouter) {
      app.use("/api/v1", resolvedOptions.adminRouter);
    }
  }

  app.use((_request, response) => {
    response.status(404).json(failure("NOT_FOUND", "Route not found."));
  });

  app.use((error: unknown, request: Request, response: Response, _next: NextFunction) => {
    if (
      error instanceof SyntaxError &&
      typeof (error as any).message === "string" &&
      (error as any).message.toLowerCase().includes("json") &&
      ((error as any).type === "entity.parse.failed" || (error as any).status === 400)
    ) {
      response.status(400).json(failure("VALIDATION_ERROR", "Invalid JSON body."));
      return;
    }

    const appError = isAppError(error) ? error : toAppError(error);
    const requestContext = request.context as { userId?: string } | undefined;
    const requestId = (request as Request & { requestId?: string }).requestId;
    const route = request.originalUrl.split("?")[0] ?? request.originalUrl;
    if (isAppError(appError)) {
      if (appError.statusCode >= 500) {
        const describedError = describeErrorForLogs(error);
        const errorContext = {
          errorMessage: describedError.message,
          errorName: describedError.name,
          errorStack: describedError.stack,
          errorCause: describedError.cause,
          errorCode: describedError.code,
          errorDetail: describedError.detail,
          errorHint: describedError.hint,
          errorWhere: describedError.where,
          errorSchema: describedError.schema,
          errorTable: describedError.table,
          errorColumn: describedError.column,
          errorConstraint: describedError.constraint,
          errorRoutine: describedError.routine
        };
        const routeContext = {
          method: request.method,
          route,
          userId: requestContext?.userId,
          requestId,
          statusCode: appError.statusCode
        };
        errorReporter.captureException(error, {
          code: appError.code,
          details: appError.details,
          ...errorContext,
          ...routeContext
        });
        logger.error("Unhandled API error", {
          code: appError.code,
          details: appError.details,
          ...errorContext,
          ...routeContext
        });
      }

      response.status(appError.statusCode).json(failure(appError.code, appError.message, appError.details));
      return;
    }

    errorReporter.captureException(error, {
      method: request.method,
      route,
      userId: requestContext?.userId,
      requestId,
      statusCode: 500
    });
    logger.error("Unexpected API error", {
      method: request.method,
      route,
      userId: requestContext?.userId,
      requestId,
      statusCode: 500,
      errorMessage: error instanceof Error ? error.message : String(error),
      errorName: error instanceof Error ? error.name : "NonErrorThrown",
      errorStack: error instanceof Error ? error.stack : undefined
    });
    response.status(500).json(failure("INTERNAL_ERROR", "Unexpected backend error."));
  });

  return app;
}
