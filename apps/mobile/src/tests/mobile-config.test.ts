import assert from "node:assert/strict";
import path from "node:path";
import { createRequire } from "node:module";

import type { MobileTestCase } from "./mobile-test-case.js";

declare const __filename: string;

function loadExpoConfigFactory() {
  const require = createRequire(__filename);
  const configPath = path.resolve(process.cwd(), "app.config.js");
  return require(configPath) as () => { extra?: { apiBaseUrl?: string } };
}

function withEnv(overrides: Record<string, string | undefined>, fn: () => void) {
  const snapshot: Record<string, string | undefined> = {};

  for (const key of Object.keys(overrides)) {
    snapshot[key] = process.env[key];
    const next = overrides[key];
    if (next === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = next;
    }
  }

  try {
    fn();
  } finally {
    for (const key of Object.keys(overrides)) {
      const previous = snapshot[key];
      if (previous === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = previous;
      }
    }
  }
}

function withMutedConsoleError(fn: () => void) {
  const original = console.error;
  console.error = () => {};
  try {
    fn();
  } finally {
    console.error = original;
  }
}

export const mobileConfigTestCases: MobileTestCase[] = [
  {
    name: "app.config: production build infers default API base URL",
    run: () => {
      const configFactory = loadExpoConfigFactory();
      withEnv(
        {
          VERCEL_ENV: "production",
          EXPO_PUBLIC_API_BASE_URL: undefined
        },
        () => {
          const config = configFactory();
          assert.equal(config.extra?.apiBaseUrl, "https://setwiseapi.vercel.app/api/v1");
        }
      );
    }
  },
  {
    name: "app.config: production build rejects non-https API base URL",
    run: () => {
      const configFactory = loadExpoConfigFactory();
      withEnv(
        {
          VERCEL_ENV: "production",
          EXPO_PUBLIC_API_BASE_URL: "http://localhost:4001/api/v1"
        },
        () => {
          withMutedConsoleError(() => {
            assert.throws(() => configFactory(), /Invalid EXPO_PUBLIC_API_BASE_URL/);
          });
        }
      );
    }
  }
];
