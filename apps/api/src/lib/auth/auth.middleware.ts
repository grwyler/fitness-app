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

  return async (request, _response, next) => {
    const authorizationHeader = request.header("authorization");
    const token = extractBearerToken(authorizationHeader);
    const requestId = (request as { requestId?: string }).requestId;
    const diagnosticContext = {
      authorizationHeaderPresent: Boolean(authorizationHeader),
      bearerTokenPresent: Boolean(token),
      requestId
    };

    if (!token) {
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
            throw new Error("Auth token has been invalidated.");
          }
        }
      }
      request.authUser = {
        email: payload.email,
        userId: payload.sub
      };
      next();
    } catch (error) {
      authLogger.warn("API auth token verification failed", {
        ...diagnosticContext,
        verificationErrorMessage: error instanceof Error ? error.message : "Unknown auth verification error.",
        verificationErrorName: error instanceof Error ? error.name : "UnknownError"
      });
      next(new AppError(401, "UNAUTHENTICATED", "Invalid bearer token."));
    }
  };
}
