import type { RequestHandler } from "express";
import { env, getClerkPublishableKeyType, getClerkSecretKeyType, getSafeKeySuffix } from "../../config/env.js";
import { AppError } from "../http/errors.js";
import { logger, type Logger } from "../observability/logger.js";
import type { ClerkAuthGetter } from "./auth.types.js";

function hasBearerToken(authorizationHeader: string | undefined) {
  return typeof authorizationHeader === "string" && /^Bearer\s+\S+/i.test(authorizationHeader);
}

export function createAuthenticateRequestMiddleware(getAuth: ClerkAuthGetter): RequestHandler {
  return createAuthenticateRequestMiddlewareWithDiagnostics(getAuth);
}

export function createAuthenticateRequestMiddlewareWithDiagnostics(
  getAuth: ClerkAuthGetter,
  dependencies?: {
    logger?: Logger;
  }
): RequestHandler {
  const authLogger = dependencies?.logger ?? logger;

  return (request, _response, next) => {
    const authorizationHeader = request.header("authorization");
    const authorizationHeaderPresent = Boolean(authorizationHeader);
    const bearerTokenPresent = hasBearerToken(authorizationHeader);
    const diagnosticContext = {
      authorizationHeaderPresent,
      bearerTokenPresent,
      clerkPublishableKeySuffix: getSafeKeySuffix(env.CLERK_PUBLISHABLE_KEY),
      clerkPublishableKeyType: getClerkPublishableKeyType(env.CLERK_PUBLISHABLE_KEY),
      clerkSecretKeySuffix: getSafeKeySuffix(env.CLERK_SECRET_KEY),
      clerkSecretKeyType: getClerkSecretKeyType(env.CLERK_SECRET_KEY)
    };

    if (!bearerTokenPresent) {
      authLogger.warn("API auth rejected request without bearer token", diagnosticContext);
      next(new AppError(401, "UNAUTHENTICATED", "Authentication is required."));
      return;
    }

    try {
      const auth = getAuth(request, { acceptsToken: "session_token" });

      if (!auth.userId) {
        authLogger.warn("API auth rejected bearer token without Clerk user", {
          ...diagnosticContext,
          clerkAuthenticated: Boolean(auth.isAuthenticated)
        });
        next(new AppError(401, "UNAUTHENTICATED", "Authentication is required."));
        return;
      }

      request.clerkUserId = auth.userId;
      next();
    } catch (error) {
      authLogger.warn("API auth token verification failed", {
        ...diagnosticContext,
        verificationErrorMessage: error instanceof Error ? error.message : "Unknown auth verification error.",
        verificationErrorName: error instanceof Error ? error.name : "UnknownError"
      });
      next(new AppError(401, "UNAUTHENTICATED", "Authentication is required."));
    }
  };
}
