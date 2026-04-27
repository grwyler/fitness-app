import type { PropsWithChildren } from "react";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useAuth, useClerk, useSession, useUser } from "@clerk/expo";
import { appendAuthDebugTimeline, logSafeAuthDiagnostic } from "./auth-debug";
import { deriveAuthStatus, type AuthStatus, type TokenStatus } from "./auth-state";
import { hasLastKnownAuthToken, registerAuthBridge, setLastKnownAuthToken } from "./auth-bridge";
import { queryClient } from "../providers/query-client";
import { useActiveWorkoutStore } from "../../features/workout/store/active-workout-store";

type AuthContextValue = {
  authDebug: {
    getTokenState: "idle" | "pending" | "resolved" | "threw";
    isClerkLoaded: boolean;
    isSignedIn: boolean;
    loadingReason: string | null;
    sessionId: string | null;
    timeoutReached: boolean;
    tokenPresent: boolean;
    tokenStatus: TokenStatus;
    userId: string | null;
  };
  status: AuthStatus;
  userEmail: string | null;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function resetClientState() {
  queryClient.clear();

  const workoutStore = useActiveWorkoutStore.getState();
  workoutStore.resetForCompletedWorkout();
  workoutStore.setLatestSummary(null);
}

export function AuthProvider({ children }: PropsWithChildren) {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const { signOut } = useClerk();
  const { session } = useSession();
  const { user } = useUser();
  const isSigningOutRef = useRef(false);
  const getTokenRef = useRef(getToken);
  const authStateRef = useRef({
    isLoaded,
    isSignedIn: Boolean(isSignedIn)
  });
  const lastReadySessionIdRef = useRef<string | null>(null);
  const previousDerivedStatusRef = useRef<AuthStatus | null>(null);
  const [tokenStatus, setTokenStatus] = useState<TokenStatus>("idle");
  const [tokenPresent, setTokenPresent] = useState(hasLastKnownAuthToken());
  const [loadingReason, setLoadingReason] = useState<string | null>("Waiting for Clerk to load.");
  const [getTokenState, setGetTokenState] = useState<"idle" | "pending" | "resolved" | "threw">("idle");
  const [timeoutReached, setTimeoutReached] = useState(false);

  useEffect(() => {
    getTokenRef.current = getToken;
    authStateRef.current = {
      isLoaded,
      isSignedIn: Boolean(isSignedIn)
    };
  }, [getToken, isLoaded, isSignedIn]);

  const setTokenStatusWithReason = useCallback((nextStatus: TokenStatus, reason: string) => {
    setTokenStatus((currentStatus) => {
      if (currentStatus !== nextStatus) {
        appendAuthDebugTimeline("token_status_transition", `from=${currentStatus}; to=${nextStatus}; reason=${reason}`);
      }
      return currentStatus === nextStatus ? currentStatus : nextStatus;
    });
  }, []);

  const resolveTokenWithTimeout = useCallback(async (mode: "default" | "skipCache", timeoutMs = 1_500) => {
    const tokenPromise =
      mode === "default" ? getTokenRef.current() : getTokenRef.current({ skipCache: true });
    return Promise.race<string | null>([
      tokenPromise,
      new Promise<string | null>((resolve) => {
        setTimeout(() => resolve(null), timeoutMs);
      })
    ]);
  }, []);

  const handleSignOut = useCallback(async () => {
    if (isSigningOutRef.current) {
      return;
    }

    appendAuthDebugTimeline("sign_out_started");
    isSigningOutRef.current = true;
    resetClientState();

    try {
      await signOut();
      appendAuthDebugTimeline("sign_out_resolved");
    } finally {
      isSigningOutRef.current = false;
    }
  }, [signOut]);

  useEffect(() => {
    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    const currentSessionId = session?.id ?? null;

    async function ensureSessionToken() {
      if (!isLoaded) {
        setTokenStatusWithReason("loading", "Clerk not loaded yet.");
        setGetTokenState("idle");
        setTimeoutReached(false);
        setLoadingReason("Waiting for Clerk to load.");
        appendAuthDebugTimeline("auth_provider_waiting_for_clerk");
        return;
      }

      if (!isSignedIn) {
        setTokenStatusWithReason("idle", "User is signed out.");
        setTokenPresent(false);
        setGetTokenState("idle");
        setTimeoutReached(false);
        setLoadingReason("User is signed out.");
        lastReadySessionIdRef.current = null;
        appendAuthDebugTimeline("auth_provider_signed_out");
        return;
      }

      if (currentSessionId && lastReadySessionIdRef.current === currentSessionId && tokenPresent) {
        setTokenStatusWithReason("ready", "Using previously validated session token.");
        setGetTokenState("resolved");
        setTimeoutReached(false);
        setLoadingReason(null);
        appendAuthDebugTimeline("auth_provider_reusing_validated_session", `session=${currentSessionId}`);
        return;
      }

      if (!tokenPresent) {
        setTokenStatusWithReason("loading", "Signed in and waiting for first session token.");
      }
      setGetTokenState("pending");
      setTimeoutReached(false);
      setLoadingReason(tokenPresent ? "Refreshing session token in background." : "Signed in, waiting for session token.");
      appendAuthDebugTimeline("auth_provider_signed_in_waiting_for_token");
      timeoutId = setTimeout(() => {
        if (cancelled) {
          return;
        }

        setTimeoutReached(true);
        setTokenStatusWithReason("unavailable", "Timed out waiting for Clerk session token.");
        setLoadingReason("Timed out waiting for Clerk session token.");
        appendAuthDebugTimeline("auth_provider_token_timeout");
      }, 8_000);

      for (let attempt = 0; attempt < 5; attempt += 1) {
        let token: string | null = null;

        try {
          appendAuthDebugTimeline("auth_provider_get_token_attempt", `attempt=${attempt + 1}; mode=default`);
          token = await resolveTokenWithTimeout("default");
          if (!token) {
            appendAuthDebugTimeline(
              "auth_provider_get_token_attempt",
              `attempt=${attempt + 1}; mode=skipCache`
            );
            token = await resolveTokenWithTimeout("skipCache");
          }
        } catch (error) {
          if (!cancelled) {
            if (timeoutId) {
              clearTimeout(timeoutId);
            }
            setGetTokenState("threw");
            setTokenStatusWithReason("unavailable", "getToken threw while checking session.");
            setLoadingReason("getToken threw while checking session.");
            appendAuthDebugTimeline(
              "auth_provider_get_token_threw",
              error instanceof Error ? error.message : "Unknown getToken error."
            );
          }
          return;
        }

        if (cancelled) {
          return;
        }

        if (token) {
          if (timeoutId) {
            clearTimeout(timeoutId);
          }
          setGetTokenState("resolved");
          setTokenStatusWithReason("ready", "Clerk returned a session token.");
          setTokenPresent(true);
          setTimeoutReached(false);
          setLoadingReason(null);
          lastReadySessionIdRef.current = currentSessionId;
          setLastKnownAuthToken(token, "auth_provider_ready");
          appendAuthDebugTimeline("auth_client_token_stored", "source=auth_provider_ready");
          appendAuthDebugTimeline("auth_provider_token_ready", `attempt=${attempt + 1}`);
          return;
        }

        if (!tokenPresent) {
          setTokenPresent(false);
        }
        setLoadingReason(`Token unavailable after attempt ${attempt + 1}.`);
        appendAuthDebugTimeline("auth_provider_token_missing_attempt", `attempt=${attempt + 1}`);

        await new Promise(resolve => setTimeout(resolve, 250));
      }

      if (!cancelled) {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        setGetTokenState("resolved");
        setTokenStatusWithReason("unavailable", "Clerk returned no token for a signed-in user.");
        setLoadingReason("Clerk returned no token for a signed-in user.");
        appendAuthDebugTimeline("auth_provider_token_unavailable");
      }
    }

    void ensureSessionToken();

    return () => {
      cancelled = true;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [isLoaded, isSignedIn, resolveTokenWithTimeout, session?.id, setTokenStatusWithReason, tokenPresent]);

  useEffect(() => {
    const unregister = registerAuthBridge({
      getToken: async () => {
        if (!authStateRef.current.isLoaded || !authStateRef.current.isSignedIn) {
          appendAuthDebugTimeline(
            "auth_bridge_get_token_skipped",
            `isLoaded=${authStateRef.current.isLoaded ? "yes" : "no"}; isSignedIn=${authStateRef.current.isSignedIn ? "yes" : "no"}`
          );
          return null;
        }

        const token = (await resolveTokenWithTimeout("default")) ?? (await resolveTokenWithTimeout("skipCache"));
        if (token) {
          setLastKnownAuthToken(token, "auth_bridge_get_token");
          setTokenPresent(currentValue => (currentValue ? currentValue : true));
          appendAuthDebugTimeline("auth_client_token_stored", "source=auth_bridge_get_token");
        }
        appendAuthDebugTimeline("auth_bridge_get_token_result", `tokenPresent=${token ? "yes" : "no"}`);
        return token;
      },
      handleUnauthorized: async () => {
        appendAuthDebugTimeline("auth_bridge_handle_unauthorized");
        await handleSignOut();
      }
    });

    return unregister;
  }, [resolveTokenWithTimeout, handleSignOut]);

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      setLastKnownAuthToken(null, "auth_provider_signed_out");
      resetClientState();
      appendAuthDebugTimeline("auth_provider_reset_client_state_signed_out");
    }
  }, [isLoaded, isSignedIn]);

  const status = deriveAuthStatus({
    isLoaded,
    isSignedIn: Boolean(isSignedIn),
    tokenPresent,
    tokenStatus
  });

  useEffect(() => {
    const previousStatus = previousDerivedStatusRef.current;
    if (previousStatus !== status) {
      appendAuthDebugTimeline(
        "auth_state_transition",
        `from=${previousStatus ?? "null"}; to=${status}; reason=isLoaded=${isLoaded ? "yes" : "no"}; isSignedIn=${isSignedIn ? "yes" : "no"}; tokenStatus=${tokenStatus}; tokenPresent=${tokenPresent ? "yes" : "no"}`
      );
      previousDerivedStatusRef.current = status;
    }

    logSafeAuthDiagnostic("auth_state", {
      getTokenState,
      isClerkLoaded: isLoaded,
      isSignedIn: Boolean(isSignedIn),
      sessionPresent: Boolean(session?.id),
      status,
      tokenPresent,
      tokenStatus,
      userIdPresent: Boolean(user?.id)
    });
  }, [getTokenState, isLoaded, isSignedIn, session?.id, status, tokenPresent, tokenStatus, user?.id]);

  const value = useMemo<AuthContextValue>(() => {
    return {
      authDebug: {
        getTokenState,
        isClerkLoaded: isLoaded,
        isSignedIn: Boolean(isSignedIn),
        loadingReason,
        sessionId: session?.id ?? null,
        timeoutReached,
        tokenPresent,
        tokenStatus,
        userId: user?.id ?? null
      },
      status,
      userEmail: user?.primaryEmailAddress?.emailAddress ?? user?.emailAddresses[0]?.emailAddress ?? null,
      signOut: handleSignOut
    };
  }, [
    getTokenState,
    isLoaded,
    isSignedIn,
    loadingReason,
    session?.id,
    timeoutReached,
    tokenPresent,
    tokenStatus,
    user,
    status,
    handleSignOut
  ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAppAuth() {
  const value = useContext(AuthContext);

  if (!value) {
    throw new Error("useAppAuth must be used within AuthProvider.");
  }

  return value;
}
