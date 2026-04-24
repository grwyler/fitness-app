import type { ApiErrorCode, ApiErrorDetail, ApiErrorEnvelope, ApiSuccessEnvelope } from "@fitness/shared";

export function success<TData>(data: TData): ApiSuccessEnvelope<TData> {
  return {
    data,
    meta: {}
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

