function createRandomSegment() {
  return Math.random().toString(36).slice(2, 10);
}

export function createIdempotencyFingerprint(payload: unknown) {
  return JSON.stringify(payload) ?? "undefined";
}

export function createIdempotencyKey(scope: string) {
  return `${scope}-${Date.now()}-${createRandomSegment()}-${createRandomSegment()}`;
}

export function resolveStableIdempotencyKey(
  input?: {
    scope: string;
    payload: unknown;
    existing?: {
      fingerprint: string;
      key: string;
    };
  }
) {
  if (!input) {
    const isDevEnvironment = typeof __DEV__ !== "undefined" && __DEV__;
    if (isDevEnvironment) {
      console.warn("[idempotency] resolveStableIdempotencyKey called without input");
    }
    return {
      key: createIdempotencyKey("unknown"),
      fingerprint: createIdempotencyFingerprint(undefined)
    };
  }

  const scope = typeof input.scope === "string" && input.scope ? input.scope : "unknown";
  const fingerprint = createIdempotencyFingerprint(input.payload);

  if (input.existing && input.existing.fingerprint === fingerprint) {
    return {
      key: input.existing.key,
      fingerprint
    };
  }

  return {
    key: createIdempotencyKey(scope),
    fingerprint
  };
}
