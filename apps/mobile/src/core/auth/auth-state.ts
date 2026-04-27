export type AuthStatus = "checking_session" | "authenticated" | "unauthenticated";

export type TokenStatus = "idle" | "loading" | "ready" | "unavailable";

export function deriveAuthStatus(input: {
  isLoaded: boolean;
  isSignedIn: boolean;
  tokenPresent: boolean;
  tokenStatus: TokenStatus;
}): AuthStatus {
  if (!input.isLoaded) {
    return "checking_session";
  }

  if (!input.isSignedIn) {
    return "unauthenticated";
  }

  return input.tokenStatus === "ready" || input.tokenPresent ? "authenticated" : "checking_session";
}
