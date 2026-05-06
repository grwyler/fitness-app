import assert from "node:assert/strict";
import { getOAuthProviderConfigStatus } from "../core/auth/oauth-config.js";
import type { MobileTestCase } from "./mobile-test-case.js";

function clearOAuthEnv() {
  delete (process.env as any).EXPO_PUBLIC_GOOGLE_OAUTH_CLIENT_ID;
  delete (process.env as any).EXPO_PUBLIC_GOOGLE_OAUTH_REDIRECT_URI;
  delete (process.env as any).EXPO_PUBLIC_FACEBOOK_OAUTH_CLIENT_ID;
  delete (process.env as any).EXPO_PUBLIC_FACEBOOK_OAUTH_REDIRECT_URI;
}

export const oauthConfigTestCases: MobileTestCase[] = [
  {
    name: "OAuth config: missing Google env vars reports both keys",
    run: () => {
      clearOAuthEnv();

      const status = getOAuthProviderConfigStatus("google");
      assert.equal(status.config, null);
      assert.ok(status.missingKeys.includes("EXPO_PUBLIC_GOOGLE_OAUTH_CLIENT_ID"));
      assert.ok(status.missingKeys.includes("EXPO_PUBLIC_GOOGLE_OAUTH_REDIRECT_URI"));
    }
  },
  {
    name: "OAuth config: Google env vars produce a config",
    run: () => {
      clearOAuthEnv();
      process.env.EXPO_PUBLIC_GOOGLE_OAUTH_CLIENT_ID = "google-client-id";
      process.env.EXPO_PUBLIC_GOOGLE_OAUTH_REDIRECT_URI = "fitnessapp://oauth";

      const status = getOAuthProviderConfigStatus("google");
      assert.ok(status.config);
      assert.equal(status.config?.clientId, "google-client-id");
      assert.equal(status.config?.redirectUri, "fitnessapp://oauth");
    }
  }
];
