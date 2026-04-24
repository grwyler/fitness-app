export type LogLevel = "info" | "warn" | "error";

export type LogContext = Record<string, unknown>;

export interface Logger {
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, context?: LogContext): void;
}

function writeLog(level: LogLevel, message: string, context?: LogContext) {
  const payload = context ? { level, message, ...context } : { level, message };
  const serialized = JSON.stringify(payload);

  if (level === "error") {
    console.error(serialized);
    return;
  }

  console.log(serialized);
}

export const logger: Logger = {
  info(message, context) {
    writeLog("info", message, context);
  },
  warn(message, context) {
    writeLog("warn", message, context);
  },
  error(message, context) {
    writeLog("error", message, context);
  }
};
