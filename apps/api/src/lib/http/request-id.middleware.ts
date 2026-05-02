import type { RequestHandler } from "express";
import { randomUUID } from "node:crypto";

declare global {
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
  namespace Express {
    interface Request {
      requestId?: string;
    }
  }
}

export function createRequestIdMiddleware(): RequestHandler {
  return (request, response, next) => {
    const existing = request.header("x-request-id");
    const requestId = existing && existing.trim().length > 0 ? existing.trim() : randomUUID();
    request.requestId = requestId;
    response.setHeader("X-Request-Id", requestId);
    next();
  };
}

