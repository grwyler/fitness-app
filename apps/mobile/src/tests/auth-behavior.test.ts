import assert from "node:assert/strict";
import { apiRequest } from "../api/client.js";
import { signInWithPassword } from "../api/auth.js";
import { hasLastKnownAuthToken, registerAuthBridge, setLastKnownAuthToken } from "../core/auth/auth-bridge.js";
import { deriveAuthStatus } from "../core/auth/auth-state.js";
import { restoreSession } from "../core/auth/restore-session.js";
import { getPrimaryButtonDisabledState, handleWebPrimaryButtonClick } from "../components/primary-button.shared.js";
import { isDashboardQueryEnabled } from "../features/workout/hooks/dashboard-query.shared.js";
import { requestResetTestDataConfirmation } from "../features/workout/utils/reset-test-data.shared.js";
import { registerNavigationBridge, resetToSignInIfNeeded } from "../core/navigation/navigation-bridge.js";
import { resetClientState } from "../core/auth/reset-client-state.js";
import { queryClient } from "../core/providers/query-client.js";
import { useActiveWorkoutStore } from "../features/workout/store/active-workout-store.js";
import type { MobileTestCase } from "./mobile-test-case.js";

type MockFetchResponse = {
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
};

function setMockFetch(implementation: (input: RequestInfo | URL, init?: RequestInit) => Promise<MockFetchResponse>) {
  globalThis.fetch = implementation as typeof fetch;
}

export const authBehaviorTestCases: MobileTestCase[] = [
  {
    name: "PrimaryButton web click calls handler",
    run: () => {
      let clickCount = 0;
      const isDisabled = getPrimaryButtonDisabledState({
        disabled: false,
        loading: false
      });

      handleWebPrimaryButtonClick({
        disabled: isDisabled,
        label: "Sign in",
        onPress: () => {
          clickCount += 1;
        }
      });

      assert.equal(clickCount, 1);
    }
  },
  {
    name: "Reset Test Data button click enters confirmation and starts reset on web approval",
    run: () => {
      let resetStartedCount = 0;
      const events: string[] = [];

      handleWebPrimaryButtonClick({
        disabled: false,
        label: "Reset Test Data",
        onPress: () => {
          let confirmReceiver: unknown = null;

          requestResetTestDataConfirmation({
            alert: {
              alert: () => {
                throw new Error("Web reset confirmation should use confirm().");
              }
            },
            confirmationMessage: "Reset test data?",
            confirm(message) {
              confirmReceiver = this;
              assert.match(message, /^Reset Test Data\n\n/);
              return true;
            },
            log: (event) => events.push(event),
            onConfirm: () => {
              resetStartedCount += 1;
            },
            platformOs: "web"
          });

          assert.equal(confirmReceiver, globalThis);
        }
      });

      assert.deepEqual(events, ["confirmation_opened", "confirmation_accepted"]);
      assert.equal(resetStartedCount, 1);
    }
  },
  {
    name: "Reset Test Data button click does not start reset when web confirmation is cancelled",
    run: () => {
      let resetStartedCount = 0;
      const events: string[] = [];

      handleWebPrimaryButtonClick({
        disabled: false,
        label: "Reset Test Data",
        onPress: () => {
          let confirmReceiver: unknown = null;

          requestResetTestDataConfirmation({
            alert: {
              alert: () => {
                throw new Error("Web reset confirmation should use confirm().");
              }
            },
            confirmationMessage: "Reset test data?",
            confirm() {
              confirmReceiver = this;
              return false;
            },
            log: (event) => events.push(event),
            onConfirm: () => {
              resetStartedCount += 1;
            },
            platformOs: "web"
          });

          assert.equal(confirmReceiver, globalThis);
        }
      });

      assert.deepEqual(events, ["confirmation_opened", "confirmation_cancelled"]);
      assert.equal(resetStartedCount, 0);
    }
  },
  {
    name: "Reset Test Data native confirmation starts reset from destructive action",
    run: () => {
      let resetStartedCount = 0;
      let destructiveAction: (() => void) | undefined;
      const events: string[] = [];

      requestResetTestDataConfirmation({
        alert: {
          alert: (_title, _message, buttons) => {
            destructiveAction = buttons?.find((button) => button.style === "destructive")?.onPress;
          }
        },
        confirmationMessage: "Reset test data?",
        log: (event) => events.push(event),
        onConfirm: () => {
          resetStartedCount += 1;
        },
        platformOs: "ios"
      });

      destructiveAction?.();

      assert.deepEqual(events, ["confirmation_opened", "confirmation_accepted"]);
      assert.equal(resetStartedCount, 1);
    }
  },
  {
    name: "Auth status waits for session restore before showing signed-out routes",
    run: () => {
      const status = deriveAuthStatus({
        restoreComplete: false,
        tokenPresent: false,
        userPresent: false
      });

      assert.equal(status, "checking_session");
    }
  },
  {
    name: "Auth status stays authenticated when restored token and user are present",
    run: () => {
      const status = deriveAuthStatus({
        restoreComplete: true,
        tokenPresent: true,
        userPresent: true
      });

      assert.equal(status, "authenticated");
    }
  },
  {
    name: "Missing restored token moves to signed-out routes only after restore completes",
    run: () => {
      const status = deriveAuthStatus({
        restoreComplete: true,
        tokenPresent: false,
        userPresent: false
      });

      assert.equal(status, "unauthenticated");
    }
  },
  {
    name: "Dashboard query is disabled until authenticated with token",
    run: () => {
      assert.equal(
        isDashboardQueryEnabled({
          status: "checking_session",
          tokenPresent: true
        }),
        false
      );
      assert.equal(
        isDashboardQueryEnabled({
          status: "authenticated",
          tokenPresent: false
        }),
        false
      );
      assert.equal(
        isDashboardQueryEnabled({
          status: "authenticated",
          tokenPresent: true
        }),
        true
      );
    }
  },
  {
    name: "Authenticated dashboard 401 triggers global sign-out and navigation reset",
    run: async () => {
      let token: string | null = "live-token";
      let unauthorizedCallCount = 0;
      let navigationResetCount = 0;
      let currentRouteName: string = "Dashboard";

      const unregisterNavigation = registerNavigationBridge({
        getCurrentRouteName: () => currentRouteName,
        isReady: () => true,
        resetToSignIn: () => {
          navigationResetCount += 1;
          currentRouteName = "SignIn";
        }
      });

      const unregister = registerAuthBridge({
        getToken: async () => token,
        handleUnauthorized: async () => {
          unauthorizedCallCount += 1;
          token = null;
          resetToSignInIfNeeded();
        }
      });

      try {
        setLastKnownAuthToken("live-token", "test_case");
        setMockFetch(async () => {
          return {
            ok: false,
            status: 401,
            json: async () => ({
              error: {
                code: "UNAUTHORIZED",
                message: "Invalid token."
              }
            })
          };
        });

        await assert.rejects(
          () => apiRequest<{ ok: boolean }>("/dashboard"),
          (error: unknown) => error instanceof Error && error.message === "Invalid token."
        );
        assert.equal(unauthorizedCallCount, 1);
        assert.equal(navigationResetCount, 1);
        assert.equal(currentRouteName, "SignIn");
        assert.equal(hasLastKnownAuthToken(), false);
      } finally {
        setLastKnownAuthToken(null, "test_case_cleanup");
        unregisterNavigation();
        unregister();
      }
    }
  },
  {
    name: "Multiple simultaneous 401s trigger a single unauthorized recovery",
    run: async () => {
      let token: string | null = "live-token";
      let unauthorizedCallCount = 0;
      let navigationResetCount = 0;
      let currentRouteName: string = "Dashboard";

      const unregisterNavigation = registerNavigationBridge({
        getCurrentRouteName: () => currentRouteName,
        isReady: () => true,
        resetToSignIn: () => {
          navigationResetCount += 1;
          currentRouteName = "SignIn";
        }
      });

      const unregister = registerAuthBridge({
        getToken: async () => token,
        handleUnauthorized: async () => {
          unauthorizedCallCount += 1;
          token = null;
          resetToSignInIfNeeded();
        }
      });

      try {
        setLastKnownAuthToken("live-token", "test_case");
        setMockFetch(async () => {
          return {
            ok: false,
            status: 401,
            json: async () => ({
              error: {
                code: "UNAUTHORIZED",
                message: "Invalid token."
              }
            })
          };
        });

        const results = await Promise.allSettled([
          apiRequest<{ ok: boolean }>("/dashboard"),
          apiRequest<{ ok: boolean }>("/dashboard"),
          apiRequest<{ ok: boolean }>("/dashboard")
        ]);

        for (const result of results) {
          assert.equal(result.status, "rejected");
        }

        assert.equal(unauthorizedCallCount, 1);
        assert.equal(navigationResetCount, 1);
        assert.equal(currentRouteName, "SignIn");
        assert.equal(hasLastKnownAuthToken(), false);
      } finally {
        setLastKnownAuthToken(null, "test_case_cleanup");
        unregisterNavigation();
        unregister();
      }
    }
  },
  {
    name: "Unauthorized recovery can run again after re-login",
    run: async () => {
      let token: string | null = "live-token";
      let unauthorizedCallCount = 0;
      let navigationResetCount = 0;
      let currentRouteName: string = "Dashboard";

      const unregisterNavigation = registerNavigationBridge({
        getCurrentRouteName: () => currentRouteName,
        isReady: () => true,
        resetToSignIn: () => {
          navigationResetCount += 1;
          currentRouteName = "SignIn";
        }
      });

      const unregister = registerAuthBridge({
        getToken: async () => token,
        handleUnauthorized: async () => {
          unauthorizedCallCount += 1;
          token = null;
          resetToSignInIfNeeded();
        }
      });

      try {
        setMockFetch(async () => {
          return {
            ok: false,
            status: 401,
            json: async () => ({
              error: {
                code: "UNAUTHORIZED",
                message: "Invalid token."
              }
            })
          };
        });

        setLastKnownAuthToken("live-token", "test_case_first");
        await assert.rejects(
          () => apiRequest<{ ok: boolean }>("/dashboard"),
          (error: unknown) => error instanceof Error && error.message === "Invalid token."
        );

        assert.equal(unauthorizedCallCount, 1);
        assert.equal(navigationResetCount, 1);
        assert.equal(currentRouteName, "SignIn");

        token = "new-token";
        currentRouteName = "Dashboard";
        setLastKnownAuthToken("new-token", "test_case_relogin");

        await assert.rejects(
          () => apiRequest<{ ok: boolean }>("/dashboard"),
          (error: unknown) => error instanceof Error && error.message === "Invalid token."
        );

        assert.equal(unauthorizedCallCount, 2);
        assert.equal(navigationResetCount, 2);
        assert.equal(currentRouteName, "SignIn");
      } finally {
        setLastKnownAuthToken(null, "test_case_cleanup");
        unregisterNavigation();
        unregister();
      }
    }
  },
  {
    name: "Navigation bridge does not reset when already on SignIn",
    run: () => {
      let navigationResetCount = 0;
      let currentRouteName: string = "SignIn";

      const unregisterNavigation = registerNavigationBridge({
        getCurrentRouteName: () => currentRouteName,
        isReady: () => true,
        resetToSignIn: () => {
          navigationResetCount += 1;
          currentRouteName = "SignIn";
        }
      });

      try {
        resetToSignInIfNeeded();
        assert.equal(navigationResetCount, 0);
      } finally {
        unregisterNavigation();
      }
    }
  },
  {
    name: "Client state reset clears active workout and query cache",
    run: () => {
      queryClient.setQueryData(["test"], { ok: true });
      useActiveWorkoutStore.setState({
        activeSessionId: "session-1",
        latestSummary: { session: { id: "session-1" } } as any
      });

      resetClientState();

      assert.equal(useActiveWorkoutStore.getState().activeSessionId, null);
      assert.equal(useActiveWorkoutStore.getState().latestSummary, null);
      assert.equal(queryClient.getQueryCache().getAll().length, 0);
    }
  },
  {
    name: "API client attaches Authorization header when bridge token exists",
    run: async () => {
      const unregister = registerAuthBridge({
        getToken: async () => null,
        handleUnauthorized: async () => {}
      });
      setLastKnownAuthToken("bridge-token", "test_case");

      let capturedAuthorizationHeader: string | null = null;

      try {
        setMockFetch(async (_input, init) => {
          const headers = init?.headers as Record<string, string>;
          capturedAuthorizationHeader = headers.Authorization ?? null;

          return {
            ok: true,
            status: 200,
            json: async () => ({
              data: {
                ok: true
              },
              meta: {}
            })
          };
        });

        await apiRequest<{ ok: boolean }>("/dashboard");
        assert.equal(capturedAuthorizationHeader, "Bearer bridge-token");
      } finally {
        setLastKnownAuthToken(null, "test_case_cleanup");
        unregister();
      }
    }
  },
  {
    name: "Sign-in surfaces backend error message for wrong credentials",
    run: async () => {
      setMockFetch(async () => {
        return {
          ok: false,
          status: 401,
          json: async () => ({
            error: {
              code: "UNAUTHENTICATED",
              message: "Email or password is incorrect."
            }
          })
        };
      });

      await assert.rejects(
        () => signInWithPassword({ email: "user@example.com", password: "wrong-pass" }),
        (error: unknown) => error instanceof Error && error.message === "Email or password is incorrect."
      );
    }
  },
  {
    name: "Session restore clears stored token on failure",
    run: async () => {
      let clearedCount = 0;
      const events: Array<{ token: string | null; source: string }> = [];

      const result = await restoreSession({
        clearStoredToken: async () => {
          clearedCount += 1;
        },
        fetchCurrentUser: async () => {
          throw new Error("Token invalid.");
        },
        readStoredToken: async () => "stored-token",
        setLastKnownAuthToken: (token, source) => {
          events.push({ token, source });
        }
      });

      assert.equal(clearedCount, 1);
      assert.deepEqual(events, [
        { token: "stored-token", source: "stored_app_auth" },
        { token: null, source: "restore_failed" }
      ]);
      assert.equal(result.status, "unauthenticated");
      assert.equal(result.token, null);
      assert.equal(result.user, null);
    }
  }
];
