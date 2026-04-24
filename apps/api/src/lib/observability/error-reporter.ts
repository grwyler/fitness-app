export interface ErrorReporter {
  captureException(error: unknown, context?: Record<string, unknown>): void;
}

export const errorReporter: ErrorReporter = {
  captureException(_error, _context) {
    // Replace this no-op adapter with Sentry or another error tracker later.
  }
};
