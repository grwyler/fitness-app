import type { AuthStatus } from "../../../core/auth/auth-state";

export function isDashboardQueryEnabled(input: {
  status: AuthStatus;
  tokenPresent: boolean;
}) {
  return input.status === "authenticated" && input.tokenPresent;
}
