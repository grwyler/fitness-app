import assert from "node:assert/strict";
import { apiRequest } from "../api/client.js";
import { getAuthErrorMessage } from "../core/auth/auth-errors.js";
import { registerAuthBridge, setLastKnownAuthToken } from "../core/auth/auth-bridge.js";
import { deriveAuthStatus } from "../core/auth/auth-state.js";
import { getPrimaryButtonDisabledState, handleWebPrimaryButtonClick } from "../components/primary-button.shared.js";
import { isDashboardQueryEnabled } from "../features/workout/hooks/dashboard-query.shared.js";
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
    name: "Auth HTML service errors show a friendly message",
    run: () => {
      const message = getAuthErrorMessage(
        new Error(`Unexpected token '<', "<html><hea"... is not valid JSON`),
        "Unable to sign in."
      );

      assert.equal(message, "Authentication service is temporarily unavailable. Please try again.");
    }
  },
  {
    name: "Clerk JSON errors still show their message",
    run: () => {
      const message = getAuthErrorMessage(
        {
          errors: [
            {
              message: "Password is incorrect."
            }
          ]
        },
        "Unable to sign in."
      );

      assert.equal(message, "Password is incorrect.");
    }
  },
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
    name: "Auth status waits for Clerk before showing signed-out routes",
    run: () => {
      const status = deriveAuthStatus({
        isLoaded: false,
        isSignedIn: false,
        tokenPresent: false,
        tokenStatus: "idle"
      });

      assert.equal(status, "checking_session");
    }
  },
  {
    name: "Auth status stays authenticated when token is already present during refresh",
    run: () => {
      const status = deriveAuthStatus({
        isLoaded: true,
        isSignedIn: true,
        tokenPresent: true,
        tokenStatus: "loading"
      });

      assert.equal(status, "authenticated");
    }
  },
  {
    name: "Token retrieval failure does not switch to signed-out navigator",
    run: () => {
      const status = deriveAuthStatus({
        isLoaded: true,
        isSignedIn: true,
        tokenPresent: false,
        tokenStatus: "unavailable"
      });

      assert.equal(status, "checking_session");
    }
  },
  {
    name: "Only Clerk signed-out state moves to SignIn",
    run: () => {
      const status = deriveAuthStatus({
        isLoaded: true,
        isSignedIn: false,
        tokenPresent: false,
        tokenStatus: "idle"
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
    name: "Authenticated dashboard 401 does not force Clerk sign-out",
    run: async () => {
      let unauthorizedCallCount = 0;
      const unregister = registerAuthBridge({
        getToken: async () => "live-token",
        handleUnauthorized: async () => {
          unauthorizedCallCount += 1;
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

        await assert.rejects(
          () => apiRequest<{ ok: boolean }>("/dashboard"),
          (error: unknown) => error instanceof Error && error.message === "Invalid token."
        );
        assert.equal(unauthorizedCallCount, 0);
      } finally {
        unregister();
      }
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
  }
];
