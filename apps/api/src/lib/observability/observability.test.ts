import assert from "node:assert/strict";
import { redactForObservability } from "@fitness/shared";
import type { ConfigTestCase } from "../../config/test-helpers/config-test-case.js";
import { buildSafeErrorContext } from "./error-reporter.js";

export const observabilityTestCases: ConfigTestCase[] = [
  {
    name: "redactForObservability: redacts common secret keys",
    run: () => {
      const redacted = redactForObservability({
        password: "super-secret",
        token: "abc123",
        authorization: "Bearer some.jwt.token",
        nested: {
          refreshToken: "refresh-123",
          safe: "ok"
        }
      }) as any;

      assert.equal(redacted.password, "[REDACTED]");
      assert.equal(redacted.token, "[REDACTED]");
      assert.equal(redacted.authorization, "[REDACTED]");
      assert.equal(redacted.nested.refreshToken, "[REDACTED]");
      assert.equal(redacted.nested.safe, "ok");
    }
  },
  {
    name: "redactForObservability: redacts bearer/jwt-like strings and URL token params",
    run: () => {
      const redacted = redactForObservability({
        header: "Bearer abc.def.ghi",
        value:
          "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c",
        link: "fitnessapp://reset-password?token=raw-reset-token&foo=bar"
      }) as any;

      assert.equal(redacted.header, "Bearer [REDACTED]");
      assert.equal(redacted.value, "[REDACTED]");
      assert.ok(typeof redacted.link === "string");
      assert.ok(
        String(redacted.link).includes("token=%5BREDACTED%5D") || String(redacted.link).includes("token=[REDACTED]")
      );
    }
  },
  {
    name: "buildSafeErrorContext: keeps requestId/userId but drops secrets",
    run: () => {
      const safe = buildSafeErrorContext({
        requestId: "req_123",
        userId: "user_456",
        password: "p@ssw0rd",
        authorization: "Bearer abc.def.ghi",
        resetToken: "reset-123",
        details: {
          idToken: "id-123",
          ok: true
        }
      }) as any;

      assert.equal(safe.requestId, "req_123");
      assert.equal(safe.userId, "user_456");
      assert.equal(safe.password, "[REDACTED]");
      assert.equal(safe.authorization, "[REDACTED]");
      assert.equal(safe.resetToken, "[REDACTED]");
      assert.equal(safe.details.idToken, "[REDACTED]");
      assert.equal(safe.details.ok, true);
    }
  }
];
