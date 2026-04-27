const AUTH_SERVICE_UNAVAILABLE_MESSAGE =
  "Authentication service is temporarily unavailable. Please try again.";

function getClerkErrorMessage(error: unknown) {
  if (typeof error !== "object" || error === null || !("errors" in error)) {
    return null;
  }

  const errors = (error as { errors?: Array<{ longMessage?: string; message?: string }> }).errors;
  return errors?.[0]?.longMessage ?? errors?.[0]?.message ?? null;
}

function isHtmlJsonParseError(message: string) {
  const normalizedMessage = message.toLowerCase();

  return (
    normalizedMessage.includes("unexpected token '<'") ||
    (normalizedMessage.includes("<html") && normalizedMessage.includes("json")) ||
    normalizedMessage.includes("is not valid json")
  );
}

function isServiceUnavailableMessage(message: string) {
  const normalizedMessage = message.toLowerCase();

  return (
    normalizedMessage.includes("503") ||
    normalizedMessage.includes("service unavailable") ||
    isHtmlJsonParseError(message)
  );
}

export function getAuthErrorMessage(error: unknown, fallbackMessage: string) {
  const clerkMessage = getClerkErrorMessage(error);
  if (clerkMessage) {
    return isServiceUnavailableMessage(clerkMessage)
      ? AUTH_SERVICE_UNAVAILABLE_MESSAGE
      : clerkMessage;
  }

  if (error instanceof Error) {
    return isServiceUnavailableMessage(error.message)
      ? AUTH_SERVICE_UNAVAILABLE_MESSAGE
      : error.message;
  }

  if (typeof error === "string") {
    return isServiceUnavailableMessage(error)
      ? AUTH_SERVICE_UNAVAILABLE_MESSAGE
      : error;
  }

  return fallbackMessage;
}

export function getSafeAuthErrorDiagnostic(error: unknown) {
  const message =
    getClerkErrorMessage(error) ??
    (error instanceof Error ? error.message : typeof error === "string" ? error : null);

  if (!message) {
    return "unknown_auth_error";
  }

  if (isServiceUnavailableMessage(message)) {
    return "auth_service_unavailable";
  }

  return "auth_error";
}
