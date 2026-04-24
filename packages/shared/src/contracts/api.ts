export type ApiSuccessEnvelope<TData, TMeta extends Record<string, unknown> = Record<string, never>> = {
  data: TData;
  meta: TMeta;
};

export type ApiErrorDetail = {
  field?: string;
  message: string;
};

export type ApiErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "BUSINESS_RULE_VIOLATION"
  | "INTERNAL_ERROR";

export type ApiErrorEnvelope = {
  error: {
    code: ApiErrorCode;
    message: string;
    details?: ApiErrorDetail[] | undefined;
  };
};
