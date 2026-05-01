import assert from "node:assert/strict";
import { createServer } from "node:http";
import type { Request } from "express";
import { createApp } from "../../app.js";
import { AppError } from "../../lib/http/errors.js";
import { bootstrapDevelopmentDatabase, DEV_USER_ID, TEST_USER_ID } from "../../lib/db/dev-bootstrap.js";
import { createPgliteClient, createPgliteDatabase } from "../../lib/db/connection.js";
import type { HttpTestCase } from "../workout/http/test-helpers/http-test-case.js";
import { createFeedbackHttpRouter } from "./feedback.module.js";

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

      next(new AppError(401, "UNAUTHENTICATED", "Authentication is required."));
    }
  };
}

async function startHttpServer(database: any) {
  const app = createApp({
    auth: createTestAuth(),
    database,
    feedbackRouter: createFeedbackHttpRouter(database)
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
    name: "Feedback entries persist in the database and are visible across devices",
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
            Authorization: "Bearer valid-user-2-token",
            "Content-Type": "application/json",
            "Idempotency-Key": entryTwo.id
          },
          body: JSON.stringify(entryTwo)
        });
        assert.equal(createResponseTwo.status, 200);

        const listResponse = await fetch(`${server.baseUrl}/api/v1/feedback`, {
          headers: createTestUserAuthHeaders()
        });
        const listPayload = await readJson(listResponse);
        assert.equal(listResponse.status, 200);
        assert.ok(Array.isArray(listPayload.data));
        const ids = listPayload.data.map((item: any) => item.id);
        assert.ok(ids.includes(entryOne.id));
        assert.ok(ids.includes(entryTwo.id));
      } finally {
        await server.close();
      }
    }
  },
  {
    name: "Feedback entries can be updated and deleted",
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
          headers: createTestUserAuthHeaders()
        });
        const listPayload = await readJson(listResponse);
        const ids = listPayload.data.map((item: any) => item.id);
        assert.equal(ids.includes(entry.id), false);
      } finally {
        await server.close();
      }
    }
  }
];
