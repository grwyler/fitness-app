import { describeErrorForLogs } from "./describe-error.js";
import { errorReporter, flushErrorReporting, initErrorReporting } from "./error-reporter.js";
import { logger } from "./logger.js";

let didInitApiObservability = false;

export function initApiObservability() {
  if (didInitApiObservability) {
    return;
  }

  didInitApiObservability = true;
  initErrorReporting();

  process.on("unhandledRejection", (reason) => {
    const described = describeErrorForLogs(reason);
    logger.error("Unhandled promise rejection", {
      errorMessage: described.message,
      errorName: described.name,
      errorStack: described.stack,
      errorCause: described.cause
    });
    errorReporter.captureException(reason, {
      source: "unhandledRejection",
      errorMessage: described.message,
      errorName: described.name
    });
    void flushErrorReporting();
  });

  process.on("uncaughtException", (error) => {
    const described = describeErrorForLogs(error);
    logger.error("Uncaught exception", {
      errorMessage: described.message,
      errorName: described.name,
      errorStack: described.stack,
      errorCause: described.cause
    });
    errorReporter.captureException(error, {
      source: "uncaughtException",
      errorMessage: described.message,
      errorName: described.name
    });
    void flushErrorReporting();
  });
}

