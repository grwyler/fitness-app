import type { ApiErrorEnvelope, ApiSuccessEnvelope } from "@fitness/shared";
import { apiConfig } from "./config";
import { MobileApiError } from "./errors";
import {
  getAuthToken,
  getLastKnownAuthTokenSource,
  handleUnauthorizedResponse,
  setLastKnownAuthToken
} from "../core/auth/auth-bridge";
import { appendAuthDebugTimeline, logSafeAuthDiagnostic, setLastAuthDebugMessage } from "../core/auth/auth-debug";
import { captureApiFailure, captureMobileException } from "../core/observability/observability";

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
  idempotencyKey?: string;
};

const isDevEnvironment = typeof __DEV__ !== "undefined" && __DEV__;

export function buildApiUrl(baseUrl: string, path: string) {
  const normalizedBaseUrl = baseUrl.replace(/\/+$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  return `${normalizedBaseUrl}${normalizedPath}`;
}

function isApiErrorEnvelope(value: unknown): value is ApiErrorEnvelope {
  return (
    typeof value === "object" &&
    value !== null &&
    "error" in value &&
    typeof (value as { error?: unknown }).error === "object"
  );
}

function isApiSuccessEnvelope<TData, TMeta extends Record<string, unknown>>(
  value: unknown
): value is ApiSuccessEnvelope<TData, TMeta> {
  return typeof value === "object" && value !== null && "data" in value && "meta" in value;
}

export async function apiRequest<TData, TMeta extends Record<string, unknown> = Record<string, unknown>>(
  path: string,
  options?: RequestOptions
): Promise<ApiSuccessEnvelope<TData, TMeta>> {
  const method = options?.method ?? "GET";
  const token = await getAuthToken();
  const tokenSource = token ? getLastKnownAuthTokenSource() ?? "live_bridge" : "none";
  const requestUrl = buildApiUrl(apiConfig.baseUrl, path);
  appendAuthDebugTimeline(
    "api_request_prepared",
    `path=${path}; url=${requestUrl}; tokenPresent=${token ? "yes" : "no"}; tokenSource=${tokenSource}`
  );
  logSafeAuthDiagnostic("api_request_prepared", {
    authorizationHeaderSet: Boolean(token),
    path,
    tokenSource
  });
  if (!token) {
    appendAuthDebugTimeline("api_request_blocked_token_not_ready", `path=${path}; tokenSource=${tokenSource}`);
  }
  if (isDevEnvironment) {
    console.info("[mobile-api] request", {
      authorizationHeaderSet: Boolean(token),
      path,
      tokenSource,
      url: requestUrl
    });
  }
  let response: Response;
  try {
    response = await fetch(requestUrl, {
      method,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options?.idempotencyKey ? { "Idempotency-Key": options.idempotencyKey } : {})
      },
      body: options?.body === undefined ? undefined : JSON.stringify(options.body)
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const debugMessage = `Network request failed for ${path}. url=${requestUrl}. message=${message}`;
    appendAuthDebugTimeline("api_request_network_error", debugMessage);
    setLastAuthDebugMessage(debugMessage);
    if (isDevEnvironment) {
      console.warn("[mobile-api] network_error", { path, url: requestUrl, message });
    }
    captureApiFailure({
      method,
      path
    });
    captureMobileException(error, {
      kind: "api_network_error",
      method,
      path
    });
    throw error;
  }

  let payload: unknown = undefined;
  try {
    payload = (await response.json()) as unknown;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const debugMessage = `API response JSON parse failed for ${path}. url=${requestUrl}. status=${response.status}. message=${message}`;
    appendAuthDebugTimeline("api_response_parse_error", debugMessage);
    setLastAuthDebugMessage(debugMessage);
    if (isDevEnvironment) {
      console.warn("[mobile-api] response_parse_error", { path, url: requestUrl, status: response.status, message });
    }

    if (response.status >= 500) {
      captureApiFailure({
        method,
        path,
        status: response.status
      });
    }
    captureMobileException(error, {
      kind: "api_response_parse_error",
      method,
      path,
      status: response.status
    });
  }
  logSafeAuthDiagnostic("api_response_received", {
    authorizationHeaderSet: Boolean(token),
    path,
    status: String(response.status),
    tokenSource
  });

  if (!response.ok) {
    if (response.status === 401) {
      const debugMessage = isApiErrorEnvelope(payload)
        ? `Authenticated API request failed with 401 on ${path}. Token present: ${token ? "yes" : "no"}. Backend code: ${payload.error.code}. Message: ${payload.error.message}.`
        : `Authenticated API request failed with 401 on ${path}. Token present: ${token ? "yes" : "no"}.`;
      appendAuthDebugTimeline("api_request_401", debugMessage);
      setLastAuthDebugMessage(debugMessage);
      appendAuthDebugTimeline("api_request_401_triggered_global_sign_out", `path=${path}`);
      setLastKnownAuthToken(null, "api_401");
      try {
        await handleUnauthorizedResponse();
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        appendAuthDebugTimeline("api_request_401_unauthorized_handler_failed", `path=${path}; message=${message}`);
      }
    }

    if (isApiErrorEnvelope(payload)) {
      const errorInput =
        payload.error.details === undefined
          ? {
              code: payload.error.code,
              message: payload.error.message,
              status: response.status
            }
          : {
              code: payload.error.code,
              message: payload.error.message,
              status: response.status,
              details: payload.error.details
            };

      if (response.status >= 500) {
        captureApiFailure({
          method,
          path,
          status: response.status,
          code: payload.error.code
        });
      }

      throw new MobileApiError(errorInput);
    }

    if (response.status >= 500) {
      captureApiFailure({
        method,
        path,
        status: response.status
      });
    }

    throw new MobileApiError({
      code: "INTERNAL_ERROR",
      message: "Unexpected API error.",
      status: response.status
    });
  }

  if (!isApiSuccessEnvelope<TData, TMeta>(payload)) {
    captureApiFailure({
      method,
      path,
      status: response.status,
      code: "UNEXPECTED_RESPONSE"
    });
    throw new MobileApiError({
      code: "INTERNAL_ERROR",
      message: "Unexpected API response.",
      status: response.status
    });
  }

  return payload;
}
