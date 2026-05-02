import assert from "node:assert/strict";
import { EnvConfigError, resetEnvForTests } from "../../config/env.js";
import { getEmailService, resetEmailServiceForTests } from "./email.service.js";
import type { ConfigTestCase } from "../../config/test-helpers/config-test-case.js";

function withPatchedEnv<T>(nextEnv: Record<string, string | undefined>, run: () => T | Promise<T>) {
  const original: Record<string, string | undefined> = {};

  for (const key of Object.keys(nextEnv)) {
    original[key] = process.env[key];
  }

  for (const key of Object.keys(nextEnv)) {
    const value = nextEnv[key];
    if (typeof value === "string") {
      process.env[key] = value;
    } else {
      delete process.env[key];
    }
  }

  try {
    return run();
  } finally {
    for (const key of Object.keys(nextEnv)) {
      const value = original[key];
      if (typeof value === "string") {
        process.env[key] = value;
      } else {
        delete process.env[key];
      }
    }

    resetEmailServiceForTests();
    resetEnvForTests();
  }
}

export const emailServiceTestCases: ConfigTestCase[] = [
  {
    name: "email.service import does not throw even when production email env is missing",
    run: async () => {
      await withPatchedEnv({
        NODE_ENV: "production",
        EMAIL_PROVIDER: undefined,
        RESEND_API_KEY: undefined,
        EMAIL_FROM: undefined,
        PASSWORD_RESET_LINK_BASE_URL: undefined,
        DATABASE_URL: "postgresql://user:pass@host/db?sslmode=require",
        JWT_SECRET: "x".repeat(32)
      }, async () => {
        const moduleUrl = new URL("./email.service.js", import.meta.url);
        await import(`${moduleUrl.href}?cacheBust=${Date.now()}`);
      });
    }
  },
  {
    name: "getEmailService throws EnvConfigError in production when email env is missing",
    run: () => {
      withPatchedEnv({
        NODE_ENV: "production",
        EMAIL_PROVIDER: undefined,
        RESEND_API_KEY: undefined,
        EMAIL_FROM: undefined,
        PASSWORD_RESET_LINK_BASE_URL: undefined,
        DATABASE_URL: "postgresql://user:pass@host/db?sslmode=require",
        JWT_SECRET: "x".repeat(32)
      }, () => {
        try {
          getEmailService();
          assert.fail("Expected getEmailService() to throw.");
        } catch (error) {
          assert.ok(error instanceof EnvConfigError);
          assert.ok(
            error.problems.some((problem) => problem.toLowerCase().includes("email_provider")),
            "Expected missing EMAIL_PROVIDER to be reported."
          );
        }
      });
    }
  }
];
