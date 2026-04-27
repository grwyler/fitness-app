import type { Request, RequestHandler } from "express";
import { AppError } from "../http/errors.js";
import type { AppAuthState } from "./auth.types.js";
import { resolveUser, type ResolvedAppUser } from "./resolve-user.js";

type DatabaseLike = {
  select: (...args: any[]) => any;
  insert: (...args: any[]) => any;
};

export function getRequestContext(request: Request) {
  if (!request.context) {
    throw new AppError(500, "INTERNAL_ERROR", "Request context is unavailable.");
  }

  return request.context;
}

export function createRequestContextMiddleware(dependencies: {
  database: DatabaseLike;
  resolveAuthenticatedUser?: (input: {
    authUser: AppAuthState;
    database: DatabaseLike;
  }) => Promise<ResolvedAppUser>;
}): RequestHandler {
  const resolveAuthenticatedUser = dependencies.resolveAuthenticatedUser ?? resolveUser;

  return (request, _response, next) => {
    if (!request.authUser) {
      next(new AppError(401, "UNAUTHENTICATED", "Authentication is required."));
      return;
    }

    void resolveAuthenticatedUser({
      authUser: request.authUser,
      database: dependencies.database
    })
      .then((user) => {
        request.context = {
          userId: user.id,
          unitSystem: user.unitSystem
        };
        next();
      })
      .catch((error: unknown) => {
        if (error instanceof AppError) {
          next(error);
          return;
        }

        next(new AppError(500, "INTERNAL_ERROR", "Unable to resolve authenticated user."));
      });
  };
}
