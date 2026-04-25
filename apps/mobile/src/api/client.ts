import type { ApiErrorEnvelope, ApiSuccessEnvelope } from "@fitness/shared";
import { apiConfig } from "./config";
import { MobileApiError } from "./errors";
import { getAuthToken, handleUnauthorizedResponse } from "../core/auth/auth-bridge";

type RequestOptions = {
  method?: "GET" | "POST";
  body?: unknown;
  idempotencyKey?: string;
};

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
      await handleUnauthorizedResponse();
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
