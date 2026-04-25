import type { PropsWithChildren } from "react";
import { createContext, useContext, useEffect, useMemo, useRef } from "react";
import { useAuth, useClerk, useUser } from "@clerk/expo";
import { registerAuthBridge } from "./auth-bridge";
import { queryClient } from "../providers/query-client";
import { useActiveWorkoutStore } from "../../features/workout/store/active-workout-store";

export type AuthStatus = "checking_session" | "authenticated" | "unauthenticated";

type AuthContextValue = {
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
  const { user } = useUser();
  const isSigningOutRef = useRef(false);

  const handleSignOut = async () => {
    if (isSigningOutRef.current) {
      return;
    }

    isSigningOutRef.current = true;
    resetClientState();

    try {
      await signOut();
    } finally {
      isSigningOutRef.current = false;
    }
  };

  useEffect(() => {
    const unregister = registerAuthBridge({
      getToken: async () => {
        if (!isLoaded || !isSignedIn) {
          return null;
        }

        return getToken();
      },
      handleUnauthorized: async () => {
        await handleSignOut();
      }
    });

    return unregister;
  }, [getToken, isLoaded, isSignedIn]);

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      resetClientState();
    }
  }, [isLoaded, isSignedIn]);

  const value = useMemo<AuthContextValue>(() => {
    const status: AuthStatus = !isLoaded
      ? "checking_session"
      : isSignedIn
        ? "authenticated"
        : "unauthenticated";

    return {
      status,
      userEmail: user?.primaryEmailAddress?.emailAddress ?? user?.emailAddresses[0]?.emailAddress ?? null,
      signOut: handleSignOut
    };
  }, [isLoaded, isSignedIn, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAppAuth() {
  const value = useContext(AuthContext);

  if (!value) {
    throw new Error("useAppAuth must be used within AuthProvider.");
  }

  return value;
}
