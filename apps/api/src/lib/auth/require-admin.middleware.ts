import type { RequestHandler } from "express";
import { AppError } from "../http/errors.js";
import { getRequestContext } from "./request-context.middleware.js";

export function requireAdmin(): RequestHandler {
  return (request, _response, next) => {
    try {
      const context = getRequestContext(request);
      if (context.role !== "admin") {
        throw new AppError(403, "FORBIDDEN", "Admin access is required.");
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

