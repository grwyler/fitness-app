import assert from "node:assert/strict";
import { oauthProviderLabels } from "../components/oauth-buttons.shared.js";
import type { MobileTestCase } from "./mobile-test-case.js";

export const oauthButtonsSharedTestCases: MobileTestCase[] = [
  {
    name: "Auth buttons include Google label",
    run: () => {
      assert.equal(oauthProviderLabels.google, "Continue with Google");
    }
  }
];
