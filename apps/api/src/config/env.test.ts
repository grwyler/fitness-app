import assert from "node:assert/strict";
import { EnvConfigError, parseEnvFrom, resetEnvForTests } from "./env.js";
import type { ConfigTestCase } from "./test-helpers/config-test-case.js";
import { detectDeploymentStage } from "./deployment-stage.js";

function baseProductionEnv(overrides?: Record<string, string | undefined>) {
  return {
    NODE_ENV: "production",
    DATABASE_URL: "postgresql://user:pass@host/db?sslmode=require",
    JWT_SECRET: "x".repeat(32),
    PASSWORD_RESET_LINK_BASE_URL: "https://example.com/reset-password",
    EMAIL_PROVIDER: "resend",
    EMAIL_FROM: "Setwise Fit <no-reply@example.com>",
    RESEND_API_KEY: "re_test_123",
    ...(overrides ?? {})
  };
}

export const envConfigTestCases: ConfigTestCase[] = [
  {
    name: "deploymentStage: vercel preview develop resolves to staging",
    run: () => {
      assert.equal(
        detectDeploymentStage({
          nodeEnv: "production",
          vercel: "1",
          vercelEnv: "preview",
          vercelGitCommitRef: "develop"
        }),
        "staging"
      );
    }
  },
  {
    name: "deploymentStage: vercel preview feature branch resolves to preview",
    run: () => {
      assert.equal(
        detectDeploymentStage({
          nodeEnv: "production",
          vercel: "1",
          vercelEnv: "preview",
          vercelGitCommitRef: "feature-x"
        }),
        "preview"
      );
    }
  },
  {
    name: "parseEnv: production with missing EMAIL_PROVIDER fails clearly",
    run: () => {
      resetEnvForTests();
      try {
        parseEnvFrom(baseProductionEnv({ EMAIL_PROVIDER: undefined }));
        assert.fail("Expected parseEnvFrom to throw.");
      } catch (error) {
        assert.ok(error instanceof EnvConfigError);
        assert.ok(error.problems.some((problem) => problem.toLowerCase().includes("email_provider")));
      }
    }
  },
  {
    name: "parseEnv: production with EMAIL_PROVIDER=resend succeeds",
    run: () => {
      resetEnvForTests();
      const env = parseEnvFrom(baseProductionEnv());
      assert.equal(env.NODE_ENV, "production");
      assert.equal(env.EMAIL_PROVIDER, "resend");
    }
  },
  {
    name: "parseEnv: production with EMAIL_PROVIDER=resend but missing RESEND_API_KEY fails",
    run: () => {
      resetEnvForTests();
      try {
        parseEnvFrom(baseProductionEnv({ RESEND_API_KEY: undefined }));
        assert.fail("Expected parseEnvFrom to throw.");
      } catch (error) {
        assert.ok(error instanceof EnvConfigError);
        assert.ok(error.problems.some((problem) => problem.toLowerCase().includes("resend_api_key")));
      }
    }
  },
  {
    name: "parseEnv: non-production defaults EMAIL_PROVIDER to console",
    run: () => {
      resetEnvForTests();
      const env = parseEnvFrom({
        NODE_ENV: "development",
        USE_PGLITE_DEV: "true"
      });
      assert.equal(env.NODE_ENV, "development");
      assert.equal(env.EMAIL_PROVIDER, "console");
    }
  },
  {
    name: "parseEnv: vercel preview feature branch does not require resend secrets",
    run: () => {
      resetEnvForTests();
      const env = parseEnvFrom({
        VERCEL: "1",
        VERCEL_ENV: "preview",
        VERCEL_GIT_COMMIT_REF: "feature-x",
        NODE_ENV: "production",
        USE_PGLITE_DEV: "true"
      });
      assert.equal(env.EMAIL_PROVIDER, "console");
    }
  },
  {
    name: "parseEnv: vercel preview develop requires resend secrets (staging)",
    run: () => {
      resetEnvForTests();
      try {
        parseEnvFrom({
          VERCEL: "1",
          VERCEL_ENV: "preview",
          VERCEL_GIT_COMMIT_REF: "develop",
          NODE_ENV: "production",
          USE_PGLITE_DEV: "false",
          DATABASE_URL: "postgresql://user:pass@host/db?sslmode=require"
        });
        assert.fail("Expected parseEnvFrom to throw.");
      } catch (error) {
        assert.ok(error instanceof EnvConfigError);
        assert.ok(error.problems.some((problem) => problem.toLowerCase().includes("jwt_secret")));
      }
    }
  }
];
