import type { RequestHandler } from "express";
import { AppError } from "../http/errors.js";
import type { ClerkAuthGetter } from "./auth.types.js";

function hasBearerToken(authorizationHeader: string | undefined) {
  return typeof authorizationHeader === "string" && /^Bearer\s+\S+/i.test(authorizationHeader);
}

export function createAuthenticateRequestMiddleware(getAuth: ClerkAuthGetter): RequestHandler {
  return (request, _response, next) => {
    if (!hasBearerToken(request.header("authorization"))) {
      next(new AppError(401, "UNAUTHENTICATED", "Authentication is required."));
      return;
    }

    try {
      const auth = getAuth(request, { acceptsToken: "session_token" });

      if (!auth.userId) {
        next(new AppError(401, "UNAUTHENTICATED", "Authentication is required."));
        return;
      }

      request.clerkUserId = auth.userId;
      next();
    } catch {
      next(new AppError(401, "UNAUTHENTICATED", "Authentication is required."));
    }
  };
}
