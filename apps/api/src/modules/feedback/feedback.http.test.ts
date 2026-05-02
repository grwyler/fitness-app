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
import { createFeedbackHttpRouter } from "./feedback.module.js";
import { createAdminHttpRouter } from "../admin/admin.module.js";
import { idempotencyRecords } from "@fitness/db";

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
    feedbackRouter: createFeedbackHttpRouter(database),
    adminRouter: createAdminHttpRouter(database)
  });
  const server = createServer(app);

  await new Promise<void>((resolve) => {
    server.listen(0, () => resolve());
  });

  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Expected feedback test server to listen on an ephemeral port.");
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

function createTestUserAuthHeaders(extraHeaders?: Record<string, string>) {
  return {
    Authorization: "Bearer valid-test-user-token",
    ...(extraHeaders ?? {})
  };
}

function createAdminAuthHeaders(extraHeaders?: Record<string, string>) {
  return {
    Authorization: "Bearer valid-admin-token",
    ...(extraHeaders ?? {})
  };
}

export const feedbackHttpTestCases: HttpTestCase[] = [
  {
    name: "Feedback routes require authentication",
    run: async () => {
      const client = createPgliteClient();
      await bootstrapDevelopmentDatabase(client as any);
      const db = createPgliteDatabase(client);

      const server = await startHttpServer(db);
      try {
        const response = await fetch(`${server.baseUrl}/api/v1/feedback`);
        assert.equal(response.status, 401);
      } finally {
        await server.close();
      }
    }
  },
  {
    name: "Feedback entries persist in the database and are scoped to the current user",
    run: async () => {
      const client = createPgliteClient();
      await bootstrapDevelopmentDatabase(client as any);
      const db = createPgliteDatabase(client);

      const server = await startHttpServer(db);
      try {
        const entryOne = {
          id: "2026-04-30T12:31:20.494Z-entry-1",
          createdAt: "2026-04-30T12:31:20.494Z",
          description: "Issue saved from device A",
          category: "Bug",
          severity: "Medium",
          priority: "P2",
          context: {
            screenName: "DashboardScreen",
            routeName: "Dashboard",
            timestamp: "2026-04-30T12:31:20.494Z",
            platform: "web",
            workoutSessionId: null,
            appVersion: "0.1.0"
          }
        };

        const createResponse = await fetch(`${server.baseUrl}/api/v1/feedback`, {
          method: "POST",
          headers: {
            ...createAuthHeaders({
              "Content-Type": "application/json",
              "Idempotency-Key": entryOne.id
            })
          },
          body: JSON.stringify(entryOne)
        });

        const createdPayload = await readJson(createResponse);
        assert.equal(createResponse.status, 200);
        assert.equal(createdPayload.data.id, entryOne.id);

        const entryTwo = {
          ...entryOne,
          id: "2026-04-30T12:35:20.494Z-entry-2",
          createdAt: "2026-04-30T12:35:20.494Z",
          description: "Issue saved from device B"
        };

        const createResponseTwo = await fetch(`${server.baseUrl}/api/v1/feedback`, {
          method: "POST",
          headers: {
            ...createAuthHeaders({
              "Content-Type": "application/json",
              "Idempotency-Key": entryTwo.id
            })
          },
          body: JSON.stringify(entryTwo)
        });
        assert.equal(createResponseTwo.status, 200);

        const listResponse = await fetch(`${server.baseUrl}/api/v1/feedback`, {
          headers: createAuthHeaders()
        });
        const listPayload = await readJson(listResponse);
        assert.equal(listResponse.status, 200);
        assert.ok(Array.isArray(listPayload.data));
        const ids = listPayload.data.map((item: any) => item.id);
        assert.ok(ids.includes(entryOne.id));
        assert.ok(ids.includes(entryTwo.id));

        const otherUserListResponse = await fetch(`${server.baseUrl}/api/v1/feedback`, {
          headers: {
            Authorization: "Bearer valid-user-2-token"
          }
        });
        const otherUserListPayload = await readJson(otherUserListResponse);
        assert.equal(otherUserListResponse.status, 200);
        assert.deepEqual(otherUserListPayload.data, []);
      } finally {
        await server.close();
      }
    }
  },
  {
    name: "Feedback entries can be updated and deleted by the reporter",
    run: async () => {
      const client = createPgliteClient();
      await bootstrapDevelopmentDatabase(client as any);
      const db = createPgliteDatabase(client);

      const server = await startHttpServer(db);
      try {
        const entry = {
          id: "2026-04-30T12:40:20.494Z-entry-3",
          createdAt: "2026-04-30T12:40:20.494Z",
          description: "Initial feedback",
          category: "Bug",
          severity: "Low",
          priority: "P3",
          context: {
            screenName: "DashboardScreen",
            routeName: "Dashboard",
            timestamp: "2026-04-30T12:40:20.494Z",
            platform: "web",
            workoutSessionId: null,
            appVersion: "0.1.0"
          }
        };

        const createResponse = await fetch(`${server.baseUrl}/api/v1/feedback`, {
          method: "POST",
          headers: createAuthHeaders({
            "Content-Type": "application/json",
            "Idempotency-Key": entry.id
          }),
          body: JSON.stringify(entry)
        });
        assert.equal(createResponse.status, 200);

        const updateResponse = await fetch(`${server.baseUrl}/api/v1/feedback/${encodeURIComponent(entry.id)}`, {
          method: "PUT",
          headers: createAuthHeaders({
            "Content-Type": "application/json"
          }),
          body: JSON.stringify({
            description: "Updated feedback",
            priority: "P1"
          })
        });
        const updatePayload = await readJson(updateResponse);
        assert.equal(updateResponse.status, 200);
        assert.equal(updatePayload.data.description, "Updated feedback");
        assert.equal(updatePayload.data.priority, "P1");

        const deleteResponse = await fetch(`${server.baseUrl}/api/v1/feedback/${encodeURIComponent(entry.id)}`, {
          method: "DELETE",
          headers: createAuthHeaders()
        });
        assert.equal(deleteResponse.status, 200);

        const listResponse = await fetch(`${server.baseUrl}/api/v1/feedback`, {
          headers: createAuthHeaders()
        });
        const listPayload = await readJson(listResponse);
        const ids = listPayload.data.map((item: any) => item.id);
        assert.equal(ids.includes(entry.id), false);
      } finally {
        await server.close();
      }
    }
  },
  {
    name: "Admin can access admin feedback routes",
    run: async () => {
      const client = createPgliteClient();
      await bootstrapDevelopmentDatabase(client as any);
      const db = createPgliteDatabase(client);

      await db.insert(idempotencyRecords).values({
        id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
        userId: TEST_USER_ID,
        key: "seed-key-1",
        routeFamily: "test",
        targetResourceId: "",
        requestFingerprint: "fingerprint",
        status: "completed",
        responseStatusCode: 200,
        responseBody: "{}",
        completedAt: new Date("2026-05-01T00:00:00.000Z"),
        createdAt: new Date("2026-05-01T00:00:00.000Z"),
        updatedAt: new Date("2026-05-01T00:00:00.000Z")
      });

      const server = await startHttpServer(db);
      try {
        const listResponse = await fetch(`${server.baseUrl}/api/v1/admin/feedback`, {
          headers: createAdminAuthHeaders()
        });
        assert.equal(listResponse.status, 200);
      } finally {
        await server.close();
      }
    }
  },
  {
    name: "Normal users cannot access admin routes",
    run: async () => {
      const client = createPgliteClient();
      await bootstrapDevelopmentDatabase(client as any);
      const db = createPgliteDatabase(client);

      const server = await startHttpServer(db);
      try {
        const response = await fetch(`${server.baseUrl}/api/v1/admin/feedback`, {
          headers: createAuthHeaders()
        });
        assert.equal(response.status, 403);
      } finally {
        await server.close();
      }
    }
  },
  {
    name: "Test account cannot access admin dashboard data",
    run: async () => {
      const client = createPgliteClient();
      await bootstrapDevelopmentDatabase(client as any);
      const db = createPgliteDatabase(client);

      const server = await startHttpServer(db);
      try {
        const response = await fetch(`${server.baseUrl}/api/v1/admin/feedback`, {
          headers: createTestUserAuthHeaders()
        });
        assert.equal(response.status, 403);
      } finally {
        await server.close();
      }
    }
  },
  {
    name: "Admin can reset the test account data",
    run: async () => {
      const client = createPgliteClient();
      await bootstrapDevelopmentDatabase(client as any);
      const db = createPgliteDatabase(client);

      await db.insert(idempotencyRecords).values({
        id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
        userId: TEST_USER_ID,
        key: "seed-key-2",
        routeFamily: "test",
        targetResourceId: "",
        requestFingerprint: "fingerprint",
        status: "completed",
        responseStatusCode: 200,
        responseBody: "{}",
        completedAt: new Date("2026-05-01T00:00:00.000Z"),
        createdAt: new Date("2026-05-01T00:00:00.000Z"),
        updatedAt: new Date("2026-05-01T00:00:00.000Z")
      });

      const server = await startHttpServer(db);
      try {
        const response = await fetch(`${server.baseUrl}/api/v1/admin/test-tools/reset-user-data`, {
          method: "POST",
          headers: createAdminAuthHeaders({
            "Content-Type": "application/json"
          }),
          body: JSON.stringify({ email: "test@test.com" })
        });
        const payload = await readJson(response);
        assert.equal(response.status, 200);
        assert.equal(payload.data.email, "test@test.com");
        assert.equal(payload.data.deleted.idempotencyRecords, 1);
      } finally {
        await server.close();
      }
    }
  },
  {
    name: "Normal users cannot reset test account data",
    run: async () => {
      const client = createPgliteClient();
      await bootstrapDevelopmentDatabase(client as any);
      const db = createPgliteDatabase(client);

      const server = await startHttpServer(db);
      try {
        const response = await fetch(`${server.baseUrl}/api/v1/admin/test-tools/reset-user-data`, {
          method: "POST",
          headers: createAuthHeaders({
            "Content-Type": "application/json"
          }),
          body: JSON.stringify({ email: "test@test.com" })
        });
        assert.equal(response.status, 403);
      } finally {
        await server.close();
      }
    }
  },
];
