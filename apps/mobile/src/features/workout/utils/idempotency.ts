function createRandomSegment() {
  return Math.random().toString(36).slice(2, 10);
}

export function createIdempotencyFingerprint(payload: unknown) {
  return JSON.stringify(payload);
}

export function createIdempotencyKey(scope: string) {
  return `${scope}-${Date.now()}-${createRandomSegment()}-${createRandomSegment()}`;
}

export function resolveStableIdempotencyKey(input: {
  scope: string;
  payload: unknown;
  existing?: {
    fingerprint: string;
    key: string;
  };
}) {
  const fingerprint = createIdempotencyFingerprint(input.payload);

  if (input.existing && input.existing.fingerprint === fingerprint) {
    return {
      key: input.existing.key,
      fingerprint
    };
  }

  return {
    key: createIdempotencyKey(input.scope),
    fingerprint
  };
}
