import type { ApiErrorEnvelope, ApiSuccessEnvelope } from "@fitness/shared";
import { apiConfig } from "./config";
import { MobileApiError } from "./errors";
import { getAuthToken, getLastKnownAuthTokenSource, handleUnauthorizedResponse } from "../core/auth/auth-bridge";
import { appendAuthDebugTimeline, setLastAuthDebugMessage } from "../core/auth/auth-debug";

type RequestOptions = {
  method?: "GET" | "POST";
  body?: unknown;
  idempotencyKey?: string;
};

const isDevEnvironment = typeof __DEV__ !== "undefined" && __DEV__;

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
  const token = await getAuthToken();
  const tokenSource = token ? getLastKnownAuthTokenSource() ?? "live_bridge" : "none";
  const requestUrl = `${apiConfig.baseUrl}${path}`;
  appendAuthDebugTimeline(
    "api_request_prepared",
    `path=${path}; url=${requestUrl}; tokenPresent=${token ? "yes" : "no"}; tokenSource=${tokenSource}`
  );
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
  const response = await fetch(`${apiConfig.baseUrl}${path}`, {
    method: options?.method ?? "GET",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options?.idempotencyKey ? { "Idempotency-Key": options.idempotencyKey } : {})
    },
    body: options?.body === undefined ? undefined : JSON.stringify(options.body)
  });

  const payload = (await response.json()) as unknown;

  if (!response.ok) {
    if (response.status === 401) {
      const debugMessage = isApiErrorEnvelope(payload)
        ? `Authenticated API request failed with 401 on ${path}. Token present: ${token ? "yes" : "no"}. Backend code: ${payload.error.code}. Message: ${payload.error.message}.`
        : `Authenticated API request failed with 401 on ${path}. Token present: ${token ? "yes" : "no"}.`;
      appendAuthDebugTimeline("api_request_401", debugMessage);
      setLastAuthDebugMessage(debugMessage);
      if (token) {
        await handleUnauthorizedResponse();
      } else {
        appendAuthDebugTimeline("api_request_401_without_token_skipped_sign_out", `path=${path}`);
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

      throw new MobileApiError(errorInput);
    }

    throw new MobileApiError({
      code: "INTERNAL_ERROR",
      message: "Unexpected API error.",
      status: response.status
    });
  }

  if (!isApiSuccessEnvelope<TData, TMeta>(payload)) {
    throw new MobileApiError({
      code: "INTERNAL_ERROR",
      message: "Unexpected API response.",
      status: response.status
    });
  }

  return payload;
}
