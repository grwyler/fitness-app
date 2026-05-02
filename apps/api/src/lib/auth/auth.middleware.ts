import type { RequestHandler } from "express";
import { AppError } from "../http/errors.js";
import { logger, type Logger } from "../observability/logger.js";
import { verifyAuthToken } from "./token.js";

function extractBearerToken(authorizationHeader: string | undefined) {
  const match = authorizationHeader?.match(/^Bearer\s+(\S+)$/i);
  return match?.[1] ?? null;
}

export function createAuthenticateRequestMiddleware(dependencies?: {
  logger?: Logger;
  verifyToken?: typeof verifyAuthToken;
}): RequestHandler {
  const authLogger = dependencies?.logger ?? logger;
  const verifyToken = dependencies?.verifyToken ?? verifyAuthToken;

  return (request, _response, next) => {
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
