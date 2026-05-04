import type { Request } from "express";
import type { RequestHandler } from "express";
import { AppError } from "./errors.js";

type RateLimitEntry = {
  count: number;
  resetAtMs: number;
};

type RateLimitOptions = {
  code?: "RATE_LIMITED";
  key: (request: Request) => string;
  max: number;
  message?: string;
  windowMs: number;
};

function getClientIp(request: Request) {
  return request.ip || request.socket.remoteAddress || "unknown";
}

export function createRateLimitMiddleware(options: RateLimitOptions): RequestHandler {
  const max = Math.max(1, Math.floor(options.max));
  const windowMs = Math.max(1, Math.floor(options.windowMs));
  const message = options.message ?? "Too many attempts. Please try again later.";

  const entries = new Map<string, RateLimitEntry>();

  function buildKey(request: Request) {
    const derived = options.key(request);
    return `${getClientIp(request)}|${derived}`;
  }

  function pruneExpiredEntries(nowMs: number) {
    // Best-effort pruning to avoid unbounded growth in long-lived processes.
    if (entries.size < 5000) {
      return;
    }

    for (const [key, entry] of entries) {
      if (entry.resetAtMs <= nowMs) {
        entries.delete(key);
      }
    }
  }

  return (request, _response, next) => {
    const nowMs = Date.now();
    pruneExpiredEntries(nowMs);

    const key = buildKey(request);
    const existing = entries.get(key);
    if (!existing || existing.resetAtMs <= nowMs) {
      entries.set(key, { count: 1, resetAtMs: nowMs + windowMs });
      next();
      return;
    }

    existing.count += 1;
    if (existing.count > max) {
      next(new AppError(429, options.code ?? "RATE_LIMITED", message));
      return;
    }

    next();
  };
}
