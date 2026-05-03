import type { Request } from "express";

type RateLimitEntry = {
  count: number;
  resetAtMs: number;
};

type SoftRateLimitOptions = {
  key: (request: Request) => string;
  max: number;
  windowMs: number;
};

function getClientIp(request: Request) {
  return request.ip || request.socket.remoteAddress || "unknown";
}

export function createSoftRateLimiter(options: SoftRateLimitOptions) {
  const max = Math.max(1, Math.floor(options.max));
  const windowMs = Math.max(1, Math.floor(options.windowMs));

  const entries = new Map<string, RateLimitEntry>();

  function buildKey(request: Request) {
    const derived = options.key(request);
    return `${getClientIp(request)}|${derived}`;
  }

  function pruneExpiredEntries(nowMs: number) {
    if (entries.size < 5000) {
      return;
    }

    for (const [key, entry] of entries) {
      if (entry.resetAtMs <= nowMs) {
        entries.delete(key);
      }
    }
  }

  return {
    allow(request: Request) {
      const nowMs = Date.now();
      pruneExpiredEntries(nowMs);

      const key = buildKey(request);
      const existing = entries.get(key);
      if (!existing || existing.resetAtMs <= nowMs) {
        entries.set(key, { count: 1, resetAtMs: nowMs + windowMs });
        return true;
      }

      existing.count += 1;
      return existing.count <= max;
    }
  };
}
