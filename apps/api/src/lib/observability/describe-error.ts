type ErrorLike = {
  name?: unknown;
  message?: unknown;
  stack?: unknown;
  cause?: unknown;
  [key: string]: unknown;
};

type ErrorDetails = {
  name?: string;
  message?: string;
  stack?: string;
  code?: unknown;
  detail?: unknown;
  hint?: unknown;
  where?: unknown;
  severity?: unknown;
  schema?: unknown;
  table?: unknown;
  column?: unknown;
  constraint?: unknown;
  dataType?: unknown;
  position?: unknown;
  internalQuery?: unknown;
  routine?: unknown;
  query?: unknown;
  params?: unknown;
  cause?: ErrorDetails;
};

function toOptionalString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function pickIfPresent(error: ErrorLike, key: string): unknown | undefined {
  return Object.prototype.hasOwnProperty.call(error, key) ? error[key] : undefined;
}

function describeKnownFields(error: ErrorLike): Omit<ErrorDetails, "name" | "message" | "stack" | "cause"> {
  return {
    code: pickIfPresent(error, "code"),
    detail: pickIfPresent(error, "detail"),
    hint: pickIfPresent(error, "hint"),
    where: pickIfPresent(error, "where"),
    severity: pickIfPresent(error, "severity"),
    schema: pickIfPresent(error, "schema"),
    table: pickIfPresent(error, "table"),
    column: pickIfPresent(error, "column"),
    constraint: pickIfPresent(error, "constraint"),
    dataType: pickIfPresent(error, "dataType"),
    position: pickIfPresent(error, "position"),
    internalQuery: pickIfPresent(error, "internalQuery"),
    routine: pickIfPresent(error, "routine")
  };
}

function describeErrorInternal(error: unknown, depth: number): ErrorDetails {
  if (depth <= 0) {
    return {
      name: "MaxCauseDepth",
      message: "Maximum error cause depth reached."
    };
  }

  if (error instanceof Error) {
    const errorLike = error as unknown as ErrorLike;
    const details: ErrorDetails = {
      name: error.name,
      message: error.message,
      ...describeKnownFields(errorLike)
    };

    if (error.stack) {
      details.stack = error.stack;
    }

    const cause = (errorLike as { cause?: unknown }).cause;
    if (cause) {
      details.cause = describeErrorInternal(cause, depth - 1);
    }

    return details;
  }

  if (typeof error === "object" && error) {
    const errorLike = error as ErrorLike;
    const details: ErrorDetails = {
      name: toOptionalString(errorLike.name) ?? "NonErrorObject",
      message: toOptionalString(errorLike.message) ?? JSON.stringify(errorLike),
      ...describeKnownFields(errorLike)
    };

    const stack = toOptionalString(errorLike.stack);
    if (stack) {
      details.stack = stack;
    }

    if (errorLike.cause) {
      details.cause = describeErrorInternal(errorLike.cause, depth - 1);
    }

    return details;
  }

  return {
    name: "NonErrorThrown",
    message: String(error)
  };
}

export function describeErrorForLogs(error: unknown): ErrorDetails {
  return describeErrorInternal(error, 5);
}
