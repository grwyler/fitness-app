import assert from "node:assert/strict";
import { apiRequest } from "../api/client.js";
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
    name: "Authenticated dashboard 401 does not force app sign-out",
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
