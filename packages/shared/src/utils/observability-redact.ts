const DEFAULT_MAX_DEPTH = 6;

const SENSITIVE_KEY_PATTERN =
  /(pass(word)?|token|secret|authorization|cookie|set-cookie|session|api[_-]?key)/i;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function looksLikeJwt(value: string) {
  // Heuristic: three base64url-ish segments with dots, long enough to be real.
  if (value.length < 30) {
    return false;
  }

  const match = value.match(/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
  return Boolean(match);
}

function redactSensitiveString(value: string) {
  const trimmed = value.trim();

  if (/^bearer\s+/i.test(trimmed)) {
    return "Bearer [REDACTED]";
  }

  if (looksLikeJwt(trimmed)) {
    return "[REDACTED]";
  }

  // Redact common token query params inside URLs / deep links.
  if (trimmed.includes("?") && /[?&](token|access_token|refresh_token|id_token|reset_token)=/i.test(trimmed)) {
    try {
      const url = new URL(trimmed);
      for (const [key] of url.searchParams) {
        if (SENSITIVE_KEY_PATTERN.test(key) || /token/i.test(key)) {
          url.searchParams.set(key, "[REDACTED]");
        }
      }
      return url.toString();
    } catch {
      return trimmed.replace(/([?&](?:token|access_token|refresh_token|id_token|reset_token)=)[^&]*/gi, "$1[REDACTED]");
    }
  }

  return value;
}

function redactInternal(
  value: unknown,
  depth: number,
  seen: WeakSet<object>
): unknown {
  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value === "string") {
    return redactSensitiveString(value);
  }

  if (typeof value === "number" || typeof value === "boolean" || typeof value === "bigint") {
    return value;
  }

  if (typeof value === "function" || typeof value === "symbol") {
    return String(value);
  }

  if (depth <= 0) {
    return "[Truncated]";
  }

  if (Array.isArray(value)) {
    return value.map((item) => redactInternal(item, depth - 1, seen));
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === "object") {
    if (seen.has(value)) {
      return "[Circular]";
    }
    seen.add(value);

    if (!isPlainObject(value)) {
      // Best effort: avoid serializing arbitrary class instances.
      return "[NonPlainObject]";
    }

    const output: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(value)) {
      if (SENSITIVE_KEY_PATTERN.test(key)) {
        // Allow safe booleans/numbers like `tokenPresent` while still redacting actual secrets.
        if (typeof child === "boolean" || typeof child === "number") {
          output[key] = child;
        } else {
          output[key] = "[REDACTED]";
        }
        continue;
      }

      output[key] = redactInternal(child, depth - 1, seen);
    }

    return output;
  }

  return String(value);
}

export function redactForObservability<T>(value: T, options?: { maxDepth?: number }): T {
  const maxDepth = options?.maxDepth ?? DEFAULT_MAX_DEPTH;
  return redactInternal(value, maxDepth, new WeakSet()) as T;
}
