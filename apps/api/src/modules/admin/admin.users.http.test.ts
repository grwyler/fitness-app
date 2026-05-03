import assert from "node:assert/strict";
import { createServer } from "node:http";
import type { Request } from "express";
import { createApp } from "../../app.js";
import { AppError } from "../../lib/http/errors.js";
import {
  ADMIN_USER_EMAIL,
  ADMIN_USER_ID,
  DEV_USER_ID,
  TEST_USER_ID,
  bootstrapDevelopmentDatabase
} from "../../lib/db/dev-bootstrap.js";
import { createPgliteClient, createPgliteDatabase } from "../../lib/db/connection.js";
import type { HttpTestCase } from "../workout/http/test-helpers/http-test-case.js";
import { createAdminHttpRouter } from "./admin.module.js";
import { users, workoutSessions } from "@fitness/db";

const USER_1_ID = "11111111-1111-1111-1111-111111111111";
const USER_2_ID = "22222222-2222-2222-2222-222222222222";

function createTestAuth() {
  return {
    authenticateRequest(request: Request, _response: unknown, next: (error?: unknown) => void) {
      const authorization = request.header("authorization");
      if (!authorization?.startsWith("Bearer ")) {
        next(new AppError(401, "UNAUTHENTICATED", "Authentication is required."));
        return;
      }

      const token = authorization.slice("Bearer ".length);
      if (token === "valid-user-1-token") {
        request.authUser = { email: "user-1@example.com", userId: USER_1_ID };
        next();
        return;
      }

      if (token === "valid-user-2-token") {
        request.authUser = { email: "user-2@example.com", userId: USER_2_ID };
        next();
        return;
      }

      if (token === "valid-test-user-token") {
        request.authUser = { email: "test@test.com", userId: TEST_USER_ID };
        next();
        return;
      }

      if (token === "valid-dev-user-token") {
        request.authUser = { email: "dev-user@example.com", userId: DEV_USER_ID };
        next();
        return;
      }

      if (token === "valid-admin-token") {
        request.authUser = { email: ADMIN_USER_EMAIL, userId: ADMIN_USER_ID };
        next();
        return;
      }

      next(new AppError(401, "UNAUTHENTICATED", "Authentication is required."));
    }
  };
}

async function startHttpServer(database: any) {
  const app = createApp({
    auth: createTestAuth(),
    database,
    adminRouter: createAdminHttpRouter(database)
  });
  const server = createServer(app);

  await new Promise<void>((resolve) => {
    server.listen(0, () => resolve());
  });

  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Expected admin users test server to listen on an ephemeral port.");
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

function createAuthHeaders(extraHeaders?: Record<string, string>) {
  return {
    Authorization: "Bearer valid-user-1-token",
    ...(extraHeaders ?? {})
  };
}

function createAdminAuthHeaders(extraHeaders?: Record<string, string>) {
  return {
    Authorization: "Bearer valid-admin-token",
    ...(extraHeaders ?? {})
  };
}

function expectSafeUserShape(user: Record<string, unknown>) {
  const keys = Object.keys(user).sort();
  assert.deepEqual(keys, [
    "createdAt",
    "email",
    "experienceLevel",
    "id",
    "lastWorkoutAt",
    "role",
    "trainingGoal",
    "unitSystem",
    "updatedAt",
    "workoutCount"
  ]);

  assert.equal(typeof user.id, "string");
  assert.equal(typeof user.email, "string");
  assert.equal(typeof user.role, "string");
  assert.equal(typeof user.workoutCount, "number");
  assert.equal(typeof user.createdAt, "string");
  assert.equal(typeof user.updatedAt, "string");
}

function expectNoSensitiveFields(user: Record<string, unknown>) {
  assert.equal("passwordHash" in user, false);
  assert.equal("password_hash" in user, false);
  assert.equal("token" in user, false);
  assert.equal("resetToken" in user, false);
  assert.equal("reset_token" in user, false);
  assert.equal("authToken" in user, false);
  assert.equal("auth_token" in user, false);
}

export const adminUsersHttpTestCases: HttpTestCase[] = [
  {
    name: "Admin users route requires authentication",
    run: async () => {
      const client = createPgliteClient();
      await bootstrapDevelopmentDatabase(client as any);
      const db = createPgliteDatabase(client);

      const server = await startHttpServer(db);
      try {
        const response = await fetch(`${server.baseUrl}/api/v1/admin/users`);
        assert.equal(response.status, 401);
      } finally {
        await server.close();
      }
    }
  },
  {
    name: "Normal users cannot list admin users",
    run: async () => {
      const client = createPgliteClient();
      await bootstrapDevelopmentDatabase(client as any);
      const db = createPgliteDatabase(client);

      const server = await startHttpServer(db);
      try {
        const response = await fetch(`${server.baseUrl}/api/v1/admin/users`, {
          headers: createAuthHeaders()
        });
        assert.equal(response.status, 403);
      } finally {
        await server.close();
      }
    }
  },
  {
    name: "Admin can list users and response excludes sensitive fields",
    run: async () => {
      const client = createPgliteClient();
      await bootstrapDevelopmentDatabase(client as any);
      const db = createPgliteDatabase(client);

      const server = await startHttpServer(db);
      try {
        const response = await fetch(`${server.baseUrl}/api/v1/admin/users`, {
          headers: createAdminAuthHeaders()
        });
        assert.equal(response.status, 200);
        const payload = await readJson(response);

        assert.equal(Array.isArray(payload.data), true);
        assert.equal(typeof payload.meta?.limit, "number");
        assert.equal(typeof payload.meta?.offset, "number");

        const first = payload.data[0] as Record<string, unknown> | undefined;
        assert.ok(first);
        expectSafeUserShape(first);
        expectNoSensitiveFields(first);
      } finally {
        await server.close();
      }
    }
  },
  {
    name: "Admin users pagination works",
    run: async () => {
      const client = createPgliteClient();
      await bootstrapDevelopmentDatabase(client as any);
      const db = createPgliteDatabase(client);

      await db.insert(users).values([
        {
          id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1",
          authProviderId: "auth-user-a1",
          email: "alpha-1@example.com",
          displayName: "Alpha 1",
          role: "user",
          timezone: "America/New_York",
          unitSystem: "imperial",
          experienceLevel: "beginner",
          trainingGoal: "strength",
          createdAt: new Date("2026-05-01T10:00:00.000Z"),
          updatedAt: new Date("2026-05-01T10:00:00.000Z")
        },
        {
          id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2",
          authProviderId: "auth-user-a2",
          email: "alpha-2@example.com",
          displayName: "Alpha 2",
          role: "user",
          timezone: "America/New_York",
          unitSystem: "imperial",
          experienceLevel: "beginner",
          trainingGoal: "strength",
          createdAt: new Date("2026-05-01T09:00:00.000Z"),
          updatedAt: new Date("2026-05-01T09:00:00.000Z")
        },
        {
          id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3",
          authProviderId: "auth-user-a3",
          email: "alpha-3@example.com",
          displayName: "Alpha 3",
          role: "user",
          timezone: "America/New_York",
          unitSystem: "imperial",
          experienceLevel: "beginner",
          trainingGoal: "strength",
          createdAt: new Date("2026-05-01T08:00:00.000Z"),
          updatedAt: new Date("2026-05-01T08:00:00.000Z")
        }
      ]);

      const server = await startHttpServer(db);
      try {
        const page1Response = await fetch(`${server.baseUrl}/api/v1/admin/users?limit=2&offset=0`, {
          headers: createAdminAuthHeaders()
        });
        assert.equal(page1Response.status, 200);
        const page1 = await readJson(page1Response);
        assert.equal(page1.data.length, 2);
        assert.equal(page1.meta.nextOffset, 2);

        const page2Response = await fetch(`${server.baseUrl}/api/v1/admin/users?limit=2&offset=2`, {
          headers: createAdminAuthHeaders()
        });
        assert.equal(page2Response.status, 200);
        const page2 = await readJson(page2Response);
        assert.equal(page2.data.length > 0, true);
      } finally {
        await server.close();
      }
    }
  },
  {
    name: "Admin users search and role filter work",
    run: async () => {
      const client = createPgliteClient();
      await bootstrapDevelopmentDatabase(client as any);
      const db = createPgliteDatabase(client);

      await db.insert(users).values([
        {
          id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1",
          authProviderId: "auth-user-b1",
          email: "search-target@example.com",
          displayName: "Search Target",
          role: "user",
          timezone: "America/New_York",
          unitSystem: "imperial",
          experienceLevel: "beginner",
          trainingGoal: "strength",
          createdAt: new Date("2026-05-01T11:00:00.000Z"),
          updatedAt: new Date("2026-05-01T11:00:00.000Z")
        },
        {
          id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2",
          authProviderId: "auth-user-b2",
          email: "second-admin@example.com",
          displayName: "Second Admin",
          role: "admin",
          timezone: "America/New_York",
          unitSystem: "imperial",
          experienceLevel: "beginner",
          trainingGoal: "strength",
          createdAt: new Date("2026-05-01T12:00:00.000Z"),
          updatedAt: new Date("2026-05-01T12:00:00.000Z")
        }
      ]);

      await db.insert(workoutSessions).values([
        {
          id: "cccccccc-cccc-cccc-cccc-ccccccccccc1",
          userId: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1",
          programId: "22222222-2222-2222-2222-222222222222",
          workoutTemplateId: "33333333-3333-3333-3333-333333333333",
          status: "completed",
          startedAt: new Date("2026-05-02T10:00:00.000Z"),
          completedAt: new Date("2026-05-02T10:45:00.000Z"),
          durationSeconds: 2700,
          isPartial: false,
          programNameSnapshot: "Program",
          workoutNameSnapshot: "Workout",
          createdAt: new Date("2026-05-02T10:00:00.000Z"),
          updatedAt: new Date("2026-05-02T10:45:00.000Z")
        }
      ]);

      const server = await startHttpServer(db);
      try {
        const searchResponse = await fetch(
          `${server.baseUrl}/api/v1/admin/users?search=${encodeURIComponent("search-target")}`,
          {
            headers: createAdminAuthHeaders()
          }
        );
        assert.equal(searchResponse.status, 200);
        const searchPayload = await readJson(searchResponse);
        assert.equal(searchPayload.data.length, 1);
        assert.equal(searchPayload.data[0].email, "search-target@example.com");
        assert.equal(searchPayload.data[0].workoutCount, 1);
        assert.equal(searchPayload.data[0].lastWorkoutAt, "2026-05-02T10:45:00.000Z");

        const roleResponse = await fetch(`${server.baseUrl}/api/v1/admin/users?role=admin`, {
          headers: createAdminAuthHeaders()
        });
        assert.equal(roleResponse.status, 200);
        const rolePayload = await readJson(roleResponse);
        assert.equal(rolePayload.data.length >= 1, true);
        assert.equal(rolePayload.data.every((row: any) => row.role === "admin"), true);
      } finally {
        await server.close();
      }
    }
  }
];

