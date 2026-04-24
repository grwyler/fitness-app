import { unitSystems } from "@fitness/shared";
import type { Request } from "express";
import { z } from "zod";
import { AppError } from "../../../lib/http/errors.js";
import type { RequestContext } from "../application/types/request-context.js";

const authHeaderSchema = z.object({
  "x-user-id": z.string().min(1),
  "x-unit-system": z.enum(unitSystems).optional()
});

// Temporary auth adapter for local development and automated tests.
// Real auth should replace this module by resolving the authenticated user from
// a verified session or bearer token and then constructing the same RequestContext.
export function resolveAuthenticatedRequestContext(request: Request): RequestContext {
  const parsedHeaders = authHeaderSchema.safeParse({
    "x-user-id": request.header("x-user-id"),
    "x-unit-system": request.header("x-unit-system")
  });

  if (!parsedHeaders.success) {
    throw new AppError(401, "UNAUTHENTICATED", "Authentication is required.");
  }

  return {
    userId: parsedHeaders.data["x-user-id"],
    unitSystem: parsedHeaders.data["x-unit-system"] ?? "imperial"
  };
}
