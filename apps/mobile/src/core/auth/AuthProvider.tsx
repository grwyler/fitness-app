import type { PropsWithChildren } from "react";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { AuthUser } from "../../api/auth";
import { fetchCurrentUser } from "../../api/auth";
import { registerAuthBridge, setLastKnownAuthToken } from "./auth-bridge";
import { clearStoredAuthToken, readStoredAuthToken, writeStoredAuthToken } from "./token-storage";
import { restoreSession } from "./restore-session";
import { resetClientState } from "./reset-client-state";
import { resetToSignInIfNeeded } from "../navigation/navigation-bridge";
import { setObservabilityUser } from "../observability/observability";

type AuthContextValue = {
  authDebug: {
    isLoaded: boolean;
    tokenPresent: boolean;
  };
  completeSignIn: (input: { token: string; user: AuthUser }) => Promise<void>;
  signOut: () => Promise<void>;
  status: "checking_session" | "authenticated" | "unauthenticated";
  userId: string | null;
  userEmail: string | null;
  userRole: AuthUser["role"] | null;
  isAdmin: boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<AuthContextValue["status"]>("checking_session");
  const unauthorizedInFlightRef = useRef<Promise<void> | null>(null);

  const completeSignIn = useCallback(async (input: { token: string; user: AuthUser }) => {
    await writeStoredAuthToken(input.token);
    setLastKnownAuthToken(input.token, "app_auth");
    setToken(input.token);
    setUser(input.user);
    setStatus("authenticated");
  }, []);

  const signOut = useCallback(async () => {
    setLastKnownAuthToken(null, "app_sign_out");
    setToken(null);
    setUser(null);
    setStatus("unauthenticated");
    resetClientState();
    try {
      await clearStoredAuthToken();
    } catch {
      // Best effort: the UI state is already reset.
    }
  }, []);

  const handleUnauthorized = useCallback(async () => {
    if (!unauthorizedInFlightRef.current) {
      unauthorizedInFlightRef.current = (async () => {
        try {
          await signOut();
          resetToSignInIfNeeded();
        } finally {
          unauthorizedInFlightRef.current = null;
        }
      })();
    }

    await unauthorizedInFlightRef.current;
  }, [signOut]);

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
    setObservabilityUser(user ? { id: user.id } : null);
  }, [user]);

  useEffect(() => {
    const unregister = registerAuthBridge({
      getToken: async () => token,
      handleUnauthorized
    });

    return unregister;
  }, [handleUnauthorized, token]);

  const value = useMemo<AuthContextValue>(() => {
    return {
      authDebug: {
        isLoaded: status !== "checking_session",
        tokenPresent: Boolean(token)
      },
      completeSignIn,
      signOut,
      status,
      userId: user?.id ?? null,
      userEmail: user?.email ?? null,
      userRole: user?.role ?? null,
      isAdmin: user?.role === "admin"
    };
  }, [completeSignIn, signOut, status, token, user?.email, user?.id, user?.role]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAppAuth() {
  const value = useContext(AuthContext);

  if (!value) {
    throw new Error("useAppAuth must be used within AuthProvider.");
  }

  return value;
}
