export type AuthStatus = "checking_session" | "authenticated" | "unauthenticated";

export function deriveAuthStatus(input: {
  restoreComplete: boolean;
  tokenPresent: boolean;
  userPresent: boolean;
}): AuthStatus {
  if (!input.restoreComplete) {
    return "checking_session";
  }

  return input.tokenPresent && input.userPresent ? "authenticated" : "unauthenticated";
}
