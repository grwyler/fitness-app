import type { ApiErrorCode, ApiErrorDetail } from "@fitness/shared";

export class MobileApiError extends Error {
  public readonly code: ApiErrorCode;
  public readonly status: number;
  public readonly details: ApiErrorDetail[] | undefined;

  public constructor(input: {
    code: ApiErrorCode;
    message: string;
    status: number;
    details?: ApiErrorDetail[];
  }) {
    super(input.message);
    this.name = "MobileApiError";
    this.code = input.code;
    this.status = input.status;
    this.details = input.details;
  }
}
