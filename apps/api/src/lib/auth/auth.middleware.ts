import type { RequestHandler } from "express";
import { users } from "@fitness/db";
import { and, eq, isNull } from "drizzle-orm";
import { AppError } from "../http/errors.js";
import { logger, type Logger } from "../observability/logger.js";
import { verifyAuthToken } from "./token.js";

function extractBearerToken(authorizationHeader: string | undefined) {
  const match = authorizationHeader?.match(/^Bearer\s+(\S+)$/i);
  return match?.[1] ?? null;
}

function setAuthDiagnosticHeaders(response: { setHeader: (name: string, value: string) => void }, input: {
  authorizationHeaderPresent: boolean;
  bearerTokenPresent: boolean;
  reason: "missing_bearer" | "invalid_bearer" | "invalidated";
}) {
  response.setHeader("X-Auth-Diagnostic", input.reason);
  response.setHeader("X-Auth-Header-Present", input.authorizationHeaderPresent ? "1" : "0");
  response.setHeader("X-Auth-Bearer-Present", input.bearerTokenPresent ? "1" : "0");
}

export function createAuthenticateRequestMiddleware(dependencies?: {
  database?: {
    select: (...args: any[]) => any;
  };
  logger?: Logger;
  verifyToken?: typeof verifyAuthToken;
}): RequestHandler {
  const authLogger = dependencies?.logger ?? logger;
  const verifyToken = dependencies?.verifyToken ?? verifyAuthToken;
  const database = dependencies?.database;

  return async (request, response, next) => {
    const authorizationHeader = request.header("authorization");
    const token = extractBearerToken(authorizationHeader);
    const requestId = (request as { requestId?: string }).requestId;
    const diagnosticContext = {
      authorizationHeaderPresent: Boolean(authorizationHeader),
      bearerTokenPresent: Boolean(token),
      requestId
    };

    if (!token) {
      setAuthDiagnosticHeaders(response, {
        authorizationHeaderPresent: Boolean(authorizationHeader),
        bearerTokenPresent: false,
        reason: "missing_bearer"
      });
      authLogger.warn("API auth rejected request without bearer token", diagnosticContext);
      next(new AppError(401, "UNAUTHENTICATED", "Missing bearer token."));
      return;
    }

    try {
      const payload = verifyToken(token);
      if (database) {
        const rows = await database
          .select({
            tokensInvalidBefore: users.tokensInvalidBefore
          })
          .from(users)
          .where(and(eq(users.id, payload.sub), isNull(users.deletedAt)))
          .limit(1);

        const tokensInvalidBefore = rows[0]?.tokensInvalidBefore ?? null;
        if (tokensInvalidBefore) {
          const invalidBeforeSeconds = Math.floor(tokensInvalidBefore.getTime() / 1000);
          if (payload.iat < invalidBeforeSeconds) {
            const invalidatedError = new Error("Auth token has been invalidated.");
            (invalidatedError as any).code = "TOKEN_INVALIDATED";
            throw invalidatedError;
          }
        }
      }
      request.authUser = {
        email: payload.email,
        userId: payload.sub
      };
      next();
    } catch (error) {
      const isInvalidated =
        error instanceof Error &&
        ((error as any).code === "TOKEN_INVALIDATED" || error.message === "Auth token has been invalidated.");
      setAuthDiagnosticHeaders(response, {
        authorizationHeaderPresent: Boolean(authorizationHeader),
        bearerTokenPresent: true,
        reason: isInvalidated ? "invalidated" : "invalid_bearer"
      });
      authLogger.warn("API auth token verification failed", {
        ...diagnosticContext,
        verificationErrorMessage: error instanceof Error ? error.message : "Unknown auth verification error.",
        verificationErrorName: error instanceof Error ? error.name : "UnknownError"
      });
      next(new AppError(401, "UNAUTHENTICATED", "Invalid bearer token."));
    }
  };
}
