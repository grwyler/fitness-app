import * as Sentry from "@sentry/node";
import { redactForObservability } from "@fitness/shared";
import { detectDeploymentStage } from "../../config/deployment-stage.js";
import { getEnv } from "../../config/env.js";

export interface ErrorReporter {
  captureException(error: unknown, context?: Record<string, unknown>): void;
}

let didInit = false;
let isEnabled = false;

function computeEnabled() {
  const env = getEnv();
  const explicit = (env as any).OBSERVABILITY_ENABLED as boolean | undefined;
  const dsn = (env as any).SENTRY_DSN as string | undefined;

  if (explicit === true) {
    return Boolean(dsn);
  }

  if (explicit === false) {
    return false;
  }

  // Default: auto-enable only in production when DSN is present.
  return env.NODE_ENV === "production" && Boolean(dsn);
}

export function initErrorReporting() {
  if (didInit) {
    return;
  }

  didInit = true;
  isEnabled = computeEnabled();
  if (!isEnabled) {
    return;
  }

  const env = getEnv() as any;
  const dsn = env.SENTRY_DSN as string | undefined;
  if (!dsn) {
    isEnabled = false;
    return;
  }

  const stage = detectDeploymentStage({
    nodeEnv: env.NODE_ENV,
    vercel: env.VERCEL,
    vercelEnv: env.VERCEL_ENV,
    vercelGitCommitRef: env.VERCEL_GIT_COMMIT_REF
  });

  Sentry.init({
    dsn: dsn,
    enabled: true,
    environment: (env.SENTRY_ENVIRONMENT as string | undefined) ?? stage,
    ...(typeof env.SENTRY_RELEASE === "string" && env.SENTRY_RELEASE.length > 0
      ? { release: env.SENTRY_RELEASE as string }
      : {}),
    tracesSampleRate: 0,
    beforeSend(event) {
      // Defensive: never ship request headers/cookies/bodies to Sentry.
      if (event.request) {
        delete (event.request as any).cookies;
        delete (event.request as any).headers;
        delete (event.request as any).data;
      }

      if (event.user && typeof event.user === "object") {
        // Keep only safe user fields.
        event.user = { id: (event.user as any).id } as any;
      }

      if (event.extra) {
        event.extra = redactForObservability(event.extra as any) as any;
      }

      return event;
    }
  });
}

export async function flushErrorReporting(timeoutMs = 2000) {
  if (!isEnabled) {
    return;
  }

  try {
    await Sentry.flush(timeoutMs);
  } catch {
    // Best-effort only.
  }
}

function toOptionalString(value: unknown) {
  return typeof value === "string" ? value : undefined;
}

export function buildSafeErrorContext(context?: Record<string, unknown>) {
  if (!context) {
    return undefined;
  }

  return redactForObservability(context);
}

export const errorReporter: ErrorReporter = {
  captureException(error, context) {
    initErrorReporting();

    if (!isEnabled) {
      return;
    }

    const safeContext = buildSafeErrorContext(context);
    const requestId = toOptionalString(safeContext?.requestId);
    const userId = toOptionalString(safeContext?.userId);
    const route = toOptionalString(safeContext?.route ?? safeContext?.path);
    const method = toOptionalString(safeContext?.method);
    const statusCode = typeof safeContext?.statusCode === "number" ? safeContext.statusCode : undefined;

    Sentry.withScope((scope) => {
      if (requestId) {
        scope.setTag("requestId", requestId);
      }
      if (route) {
        scope.setTag("route", route);
      }
      if (method) {
        scope.setTag("method", method);
      }
      if (typeof statusCode === "number") {
        scope.setTag("statusCode", String(statusCode));
      }
      if (userId) {
        scope.setUser({ id: userId });
      }

      if (safeContext) {
        scope.setExtras(safeContext);
      }

      Sentry.captureException(error instanceof Error ? error : new Error(String(error)));
    });
  }
};
