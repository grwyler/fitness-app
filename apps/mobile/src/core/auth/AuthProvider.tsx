import type { PropsWithChildren } from "react";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { AuthUser } from "../../api/auth";
import { fetchCurrentUser } from "../../api/auth";
import { registerAuthBridge, setLastKnownAuthToken } from "./auth-bridge";
import { clearStoredAuthToken, readStoredAuthToken, writeStoredAuthToken } from "./token-storage";
import { restoreSession } from "./restore-session";
import { queryClient } from "../providers/query-client";
import { useActiveWorkoutStore } from "../../features/workout/store/active-workout-store";

type AuthContextValue = {
  authDebug: {
    isLoaded: boolean;
    tokenPresent: boolean;
  };
  completeSignIn: (input: { token: string; user: AuthUser }) => Promise<void>;
  signOut: () => Promise<void>;
  status: "checking_session" | "authenticated" | "unauthenticated";
  userEmail: string | null;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function resetClientState() {
  queryClient.clear();

  const workoutStore = useActiveWorkoutStore.getState();
  workoutStore.resetForCompletedWorkout();
  workoutStore.setLatestSummary(null);
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<AuthContextValue["status"]>("checking_session");

  const completeSignIn = useCallback(async (input: { token: string; user: AuthUser }) => {
    await writeStoredAuthToken(input.token);
    setLastKnownAuthToken(input.token, "app_auth");
    setToken(input.token);
    setUser(input.user);
    setStatus("authenticated");
  }, []);

  const signOut = useCallback(async () => {
    await clearStoredAuthToken();
    setLastKnownAuthToken(null, "app_sign_out");
    setToken(null);
    setUser(null);
    setStatus("unauthenticated");
    resetClientState();
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function restoreAppSession() {
      const result = await restoreSession({
        clearStoredToken: clearStoredAuthToken,
        fetchCurrentUser,
        readStoredToken: readStoredAuthToken,
        setLastKnownAuthToken
      });

      if (cancelled) {
        return;
      }

      setToken(result.token);
      setUser(result.user);
      setStatus(result.status);
    }

    void restoreAppSession();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const unregister = registerAuthBridge({
      getToken: async () => token,
      handleUnauthorized: async () => {}
    });

    return unregister;
  }, [token]);

  const value = useMemo<AuthContextValue>(() => {
    return {
      authDebug: {
        isLoaded: status !== "checking_session",
        tokenPresent: Boolean(token)
      },
      completeSignIn,
      signOut,
      status,
      userEmail: user?.email ?? null
    };
  }, [completeSignIn, signOut, status, token, user?.email]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAppAuth() {
  const value = useContext(AuthContext);

  if (!value) {
    throw new Error("useAppAuth must be used within AuthProvider.");
  }

  return value;
}
