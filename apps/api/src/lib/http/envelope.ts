import type { ApiErrorCode, ApiErrorDetail, ApiErrorEnvelope, ApiSuccessEnvelope } from "@fitness/shared";

export function success<TData, TMeta extends Record<string, unknown> = Record<string, never>>(
  data: TData,
  meta?: TMeta
): ApiSuccessEnvelope<TData, TMeta> {
  return {
    data,
    meta: (meta ?? {}) as TMeta
  };
}

export function failure(code: ApiErrorCode, message: string, details?: ApiErrorDetail[]): ApiErrorEnvelope {
  return {
    error: {
      code,
      message,
      details
    }
  };
}
