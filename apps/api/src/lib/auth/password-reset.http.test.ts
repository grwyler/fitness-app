import assert from "node:assert/strict";
import { createServer } from "node:http";
import { createHmac, randomUUID } from "node:crypto";
import { Router } from "express";
import { passwordResetTokens, users } from "@fitness/db";
import { and, eq, isNull } from "drizzle-orm";
import { createApp } from "../../app.js";
import { getEnv } from "../../config/env.js";
import { hashPasswordResetToken } from "./password-reset.js";
import { hashPassword } from "./password.js";
import { bootstrapDevelopmentDatabase, TEST_USER_EMAIL } from "../db/dev-bootstrap.js";
import { createPgliteClient, createPgliteDatabase } from "../db/connection.js";
import type { HttpTestCase } from "../../modules/workout/http/test-helpers/http-test-case.js";
import { getLastPasswordResetEmail, resetEmailTestStore } from "../email/email.test-store.js";

function base64UrlEncode(value: string) {
  return Buffer.from(value).toString("base64url");
}

function signAuthToken(unsignedToken: string, secret: string) {
  return createHmac("sha256", secret).update(unsignedToken).digest("base64url");
}

function createCustomAuthToken(input: {
  email: string;
  exp: number;
  iat: number;
  userId: string;
}) {
  const header = base64UrlEncode(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = base64UrlEncode(
    JSON.stringify({
      email: input.email,
      exp: input.exp,
      iat: input.iat,
      sub: input.userId
    })
  );
  const unsignedToken = `${header}.${payload}`;

  return `${unsignedToken}.${signAuthToken(unsignedToken, getEnv().JWT_SECRET)}`;
}

async function startHttpServer(database: any) {
  const app = createApp({
    database,
    workoutRouter: Router()
  });
  const server = createServer(app);

  await new Promise<void>((resolve) => {
    server.listen(0, () => resolve());
  });

  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Expected password reset test server to listen on an ephemeral port.");
  }

  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    close: async () =>
      new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      })
  };
}

async function readJson(response: Response) {
  return (await response.json()) as Record<string, any>;
}

function extractTokenFromLink(link: string) {
  const url = new URL(link);
  const token = url.searchParams.get("token");
  if (!token) {
    throw new Error("Expected reset link to include token parameter.");
  }
  return token;
}

export const passwordResetHttpTestCases: HttpTestCase[] = [
  {
    name: "Password reset request does not reveal account existence",
    run: async () => {
      resetEmailTestStore();
      const client = createPgliteClient();
      await bootstrapDevelopmentDatabase(client);
      const database = createPgliteDatabase(client);
      const server = await startHttpServer(database);

      try {
        const existingResponse = await fetch(`${server.baseUrl}/api/v1/auth/password-reset/request`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ email: TEST_USER_EMAIL })
        });
        const missingResponse = await fetch(`${server.baseUrl}/api/v1/auth/password-reset/request`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ email: "missing@example.com" })
        });

        assert.equal(existingResponse.status, 200);
        assert.equal(missingResponse.status, 200);

        const existingPayload = await readJson(existingResponse);
        const missingPayload = await readJson(missingResponse);
        assert.deepEqual(existingPayload, missingPayload);
      } finally {
        await server.close();
      }
    }
  },
  {
    name: "Valid password reset token updates password and invalidates old credentials",
    run: async () => {
      resetEmailTestStore();
      const client = createPgliteClient();
      await bootstrapDevelopmentDatabase(client);
      const database = createPgliteDatabase(client);
      const server = await startHttpServer(database);

      try {
        const requestResponse = await fetch(`${server.baseUrl}/api/v1/auth/password-reset/request`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ email: TEST_USER_EMAIL })
        });

        assert.equal(requestResponse.status, 200);
        const email = getLastPasswordResetEmail(TEST_USER_EMAIL);
        assert.ok(email, "Expected password reset email to be recorded for existing user.");

        const token = extractTokenFromLink(email.resetLink);
        const confirmResponse = await fetch(`${server.baseUrl}/api/v1/auth/password-reset/confirm`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ token, password: "new-password-123" })
        });
        assert.equal(confirmResponse.status, 200);

        const oldPasswordSignIn = await fetch(`${server.baseUrl}/api/v1/auth/signin`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ email: TEST_USER_EMAIL, password: "password" })
        });
        assert.equal(oldPasswordSignIn.status, 401);

        const newPasswordSignIn = await fetch(`${server.baseUrl}/api/v1/auth/signin`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ email: TEST_USER_EMAIL, password: "new-password-123" })
        });
        assert.equal(newPasswordSignIn.status, 200);

        const newSignInPayload = await readJson(newPasswordSignIn);
        const meResponse = await fetch(`${server.baseUrl}/api/v1/auth/me`, {
          headers: { Authorization: `Bearer ${newSignInPayload.data.token}` }
        });
        assert.equal(meResponse.status, 200);
      } finally {
        await server.close();
      }
    }
  },
  {
    name: "Password reset invalidates existing JWT tokens",
    run: async () => {
      resetEmailTestStore();
      const client = createPgliteClient();
      await bootstrapDevelopmentDatabase(client);
      const database = createPgliteDatabase(client);
      const server = await startHttpServer(database);

      try {
        const [userRow] = await database
          .select({ id: users.id })
          .from(users)
          .where(and(eq(users.email, TEST_USER_EMAIL), isNull(users.deletedAt)))
          .limit(1);

        assert.ok(userRow, "Expected bootstrapped test user to exist.");

        const nowSeconds = Math.floor(Date.now() / 1000);
        const oldToken = createCustomAuthToken({
          email: TEST_USER_EMAIL,
          exp: nowSeconds + 60 * 60,
          iat: nowSeconds - 60,
          userId: userRow.id
        });

        const meBeforeReset = await fetch(`${server.baseUrl}/api/v1/auth/me`, {
          headers: { Authorization: `Bearer ${oldToken}` }
        });
        assert.equal(meBeforeReset.status, 200);

        const requestResponse = await fetch(`${server.baseUrl}/api/v1/auth/password-reset/request`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ email: TEST_USER_EMAIL })
        });

        assert.equal(requestResponse.status, 200);
        const email = getLastPasswordResetEmail(TEST_USER_EMAIL);
        assert.ok(email, "Expected password reset email to be recorded for existing user.");

        const token = extractTokenFromLink(email.resetLink);
        const confirmResponse = await fetch(`${server.baseUrl}/api/v1/auth/password-reset/confirm`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ token, password: "new-password-123" })
        });
        assert.equal(confirmResponse.status, 200);

        const meAfterReset = await fetch(`${server.baseUrl}/api/v1/auth/me`, {
          headers: { Authorization: `Bearer ${oldToken}` }
        });
        assert.equal(meAfterReset.status, 401);
      } finally {
        await server.close();
      }
    }
  },
  {
    name: "Expired password reset token fails",
    run: async () => {
      resetEmailTestStore();
      const client = createPgliteClient();
      await bootstrapDevelopmentDatabase(client);
      const database = createPgliteDatabase(client);
      const server = await startHttpServer(database);

      try {
        const token = "expired-token-value";
        const tokenHash = hashPasswordResetToken(token);
        const passwordHash = await hashPassword("password");

        const [userRow] = await database
          .select({ id: users.id })
          .from(users)
          .where(and(eq(users.email, TEST_USER_EMAIL), isNull(users.deletedAt)))
          .limit(1);

        assert.ok(userRow, "Expected bootstrapped test user to exist.");

        await database.insert(passwordResetTokens).values({
          id: randomUUID(),
          userId: userRow.id,
          tokenHash,
          expiresAt: new Date(Date.now() - 60_000),
          consumedAt: null
        });

        await database
          .update(users)
          .set({ passwordHash })
          .where(eq(users.id, userRow.id));

        const confirmResponse = await fetch(`${server.baseUrl}/api/v1/auth/password-reset/confirm`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, password: "new-password-123" })
        });

        assert.equal(confirmResponse.status, 400);
      } finally {
        await server.close();
      }
    }
  },
  {
    name: "Used password reset token fails",
    run: async () => {
      resetEmailTestStore();
      const client = createPgliteClient();
      await bootstrapDevelopmentDatabase(client);
      const database = createPgliteDatabase(client);
      const server = await startHttpServer(database);

      try {
        const token = "used-token-value";
        const tokenHash = hashPasswordResetToken(token);

        const [userRow] = await database
          .select({ id: users.id })
          .from(users)
          .where(and(eq(users.email, TEST_USER_EMAIL), isNull(users.deletedAt)))
          .limit(1);

        assert.ok(userRow, "Expected bootstrapped test user to exist.");

        await database.insert(passwordResetTokens).values({
          id: randomUUID(),
          userId: userRow.id,
          tokenHash,
          expiresAt: new Date(Date.now() + 60_000),
          consumedAt: new Date()
        });

        const confirmResponse = await fetch(`${server.baseUrl}/api/v1/auth/password-reset/confirm`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, password: "new-password-123" })
        });

        assert.equal(confirmResponse.status, 400);
      } finally {
        await server.close();
      }
    }
  },
  {
    name: "Invalid password reset token fails",
    run: async () => {
      resetEmailTestStore();
      const client = createPgliteClient();
      await bootstrapDevelopmentDatabase(client);
      const database = createPgliteDatabase(client);
      const server = await startHttpServer(database);

      try {
        const confirmResponse = await fetch(`${server.baseUrl}/api/v1/auth/password-reset/confirm`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: "does-not-exist", password: "new-password-123" })
        });

        assert.equal(confirmResponse.status, 400);
      } finally {
        await server.close();
      }
    }
  },
  {
    name: "Password reset endpoints are accessible without authentication",
    run: async () => {
      resetEmailTestStore();
      const client = createPgliteClient();
      await bootstrapDevelopmentDatabase(client);
      const database = createPgliteDatabase(client);
      const server = await startHttpServer(database);

      try {
        const requestResponse = await fetch(`${server.baseUrl}/api/v1/auth/password-reset/request`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: TEST_USER_EMAIL })
        });
        assert.equal(requestResponse.status, 200);

        const email = getLastPasswordResetEmail(TEST_USER_EMAIL);
        assert.ok(email);
        const token = extractTokenFromLink(email.resetLink);

        const confirmResponse = await fetch(`${server.baseUrl}/api/v1/auth/password-reset/confirm`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, password: "new-password-123" })
        });
        assert.equal(confirmResponse.status, 200);
      } finally {
        await server.close();
      }
    }
  }
];
