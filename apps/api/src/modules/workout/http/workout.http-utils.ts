import type { NextFunction, Request, RequestHandler, Response } from "express";
import type { z } from "zod";
import { AppError } from "../../../lib/http/errors.js";

export function validateBody<TSchema extends z.ZodTypeAny>(schema: TSchema, request: Request) {
  return schema.parse(request.body);
}

export function validateParams<TSchema extends z.ZodTypeAny>(schema: TSchema, request: Request) {
  return schema.parse(request.params);
}

export function requireIdempotencyKey(request: Request): string {
  const idempotencyKey = request.header("Idempotency-Key");
  if (!idempotencyKey) {
    throw new AppError(400, "VALIDATION_ERROR", "Idempotency-Key header is required.", [
      {
        field: "Idempotency-Key",
        message: "This header is required for mutation routes."
      }
    ]);
  }

  return idempotencyKey;
}

export function asyncHandler(
  handler: (request: Request, response: Response, next: NextFunction) => Promise<void>
): RequestHandler {
  return (request, response, next) => {
    void handler(request, response, next).catch(next);
  };
}
