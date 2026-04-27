import assert from "node:assert/strict";
import { createServer } from "node:http";
import { users } from "@fitness/db";
import type { Request } from "express";
import { createApp } from "../../../app.js";
import type { HttpTestCase } from "./test-helpers/http-test-case.js";
import { createWorkoutHttpRouter } from "./workout.module.js";
import {
  createWorkoutInfrastructureTestContext,
  disposeWorkoutInfrastructureTestContext,
  seedBaseWorkoutProgram,
  seedInProgressWorkout
} from "../infrastructure/test-helpers/integration-db.js";

function createTestAuth() {
  const clerkUsers = new Map([
    [
      "auth-user-1",
      {
        id: "auth-user-1",
        emailAddresses: [{ id: "email-auth-user-1", emailAddress: "user-1@example.com" }],
        firstName: "User",
        lastName: "One",
        primaryEmailAddressId: "email-auth-user-1",
        username: "user-one"
      }
    ],
    [
      "auth-user-new",
      {
        id: "auth-user-new",
        emailAddresses: [{ id: "email-auth-user-new", emailAddress: "new-user@example.com" }],
        firstName: "New",
        lastName: "User",
        primaryEmailAddressId: "email-auth-user-new",
        username: "new-user"
      }
    ]
  ]);

  return {
    clerkClient: {
      users: {
        async getUser(userId: string) {
          const user = clerkUsers.get(userId);
          if (!user) {
            throw new Error("Unknown Clerk user.");
          }

          return user;
        }
      }
    },
    clerkGetAuth(request: Request) {
      const authorization = request.header("authorization");
      if (!authorization?.startsWith("Bearer ")) {
        return { userId: null, isAuthenticated: false };
      }

      const token = authorization.slice("Bearer ".length);
      if (token === "valid-user-1-token") {
        return { userId: "auth-user-1", isAuthenticated: true };
      }

      if (token === "valid-new-user-token") {
        return { userId: "auth-user-new", isAuthenticated: true };
      }

      if (token === "exploding-token") {
        throw new Error("Token verification failed.");
      }

      return { userId: null, isAuthenticated: false };
    },
    clerkMiddleware: () => (_request: unknown, _response: unknown, next: () => void) => next()
  };
}

async function startHttpServer(database: any) {
  const app = createApp({
    auth: createTestAuth(),
    database,
    workoutRouter: createWorkoutHttpRouter(database)
  });
  const server = createServer(app);

  await new Promise<void>((resolve) => {
    server.listen(0, () => resolve());
  });

  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Expected test server to listen on an ephemeral port.");
  }

  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    close: async () =>
      new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      })
  };
}

function createAuthHeaders(extraHeaders?: Record<string, string>) {
  return {
    Authorization: "Bearer valid-user-1-token",
    ...(extraHeaders ?? {})
  };
}

async function readJson(response: Response) {
  return (await response.json()) as Record<string, any>;
}

export const workoutHttpTestCases: HttpTestCase[] = [
  {
    name: "GET /api/v1/dashboard returns dashboard data",
    run: async () => {
      const context = await createWorkoutInfrastructureTestContext();

      try {
        await seedBaseWorkoutProgram(context);
        const server = await startHttpServer(context.db);

        try {
          const response = await fetch(`${server.baseUrl}/api/v1/dashboard`, {
            headers: createAuthHeaders()
          });
          const payload = await readJson(response);

          assert.equal(response.status, 200);
          assert.equal(payload.data.nextWorkoutTemplate.id, "template-1");
          assert.equal(payload.data.activeWorkoutSession, null);
          assert.equal(payload.meta.replayed, false);
        } finally {
          await server.close();
        }
      } finally {
        await disposeWorkoutInfrastructureTestContext(context);
      }
    }
  },
  {
    name: "GET /api/v1/programs returns predefined program details",
    run: async () => {
      const context = await createWorkoutInfrastructureTestContext();

      try {
        await seedBaseWorkoutProgram(context);
        const server = await startHttpServer(context.db);

        try {
          const response = await fetch(`${server.baseUrl}/api/v1/programs`, {
            headers: createAuthHeaders()
          });
          const payload = await readJson(response);

          assert.equal(response.status, 200);
          assert.equal(payload.data.programs[0].name, "Beginner Full Body V1");
          assert.equal(payload.data.programs[0].workouts[0].name, "Workout A");
          assert.equal(payload.data.programs[0].workouts[0].exercises[0].exerciseName, "Bench Press");
        } finally {
          await server.close();
        }
      } finally {
        await disposeWorkoutInfrastructureTestContext(context);
      }
    }
  },
  {
    name: "POST /api/v1/programs/:programId/follow starts a program for a new user",
    run: async () => {
      const context = await createWorkoutInfrastructureTestContext();

      try {
        await seedBaseWorkoutProgram(context);
        const server = await startHttpServer(context.db);

        try {
          const response = await fetch(`${server.baseUrl}/api/v1/programs/program-1/follow`, {
            method: "POST",
            headers: {
              Authorization: "Bearer valid-new-user-token"
            }
          });
          const payload = await readJson(response);

          assert.equal(response.status, 201);
          assert.equal(payload.data.activeProgram.program.id, "program-1");
          assert.equal(payload.data.activeProgram.nextWorkoutTemplate.id, "template-1");
        } finally {
          await server.close();
        }
      } finally {
        await disposeWorkoutInfrastructureTestContext(context);
      }
    }
  },
  {
    name: "GET /api/v1/workout-sessions/current returns the active session",
    run: async () => {
      const context = await createWorkoutInfrastructureTestContext();

      try {
        await seedBaseWorkoutProgram(context);
        await seedInProgressWorkout(context, {
          setStatuses: ["pending", "pending", "pending"],
          actualReps: [0, 0, 0]
        });

        const server = await startHttpServer(context.db);

        try {
          const response = await fetch(`${server.baseUrl}/api/v1/workout-sessions/current`, {
            headers: createAuthHeaders()
          });
          const payload = await readJson(response);

          assert.equal(response.status, 200);
          assert.equal(payload.data.activeWorkoutSession.id, "session-1");
          assert.equal(payload.data.activeWorkoutSession.exercises[0].sets.length, 3);
        } finally {
          await server.close();
        }
      } finally {
        await disposeWorkoutInfrastructureTestContext(context);
      }
    }
  },
  {
    name: "POST /api/v1/workout-sessions/start starts a workout session",
    run: async () => {
      const context = await createWorkoutInfrastructureTestContext();

      try {
        await seedBaseWorkoutProgram(context);
        const server = await startHttpServer(context.db);

        try {
          const response = await fetch(`${server.baseUrl}/api/v1/workout-sessions/start`, {
            method: "POST",
            headers: createAuthHeaders({
              "content-type": "application/json",
              "Idempotency-Key": "start-http-key-1"
            }),
            body: JSON.stringify({})
          });
          const payload = await readJson(response);

          assert.equal(response.status, 201);
          assert.equal(payload.data.status, "in_progress");
          assert.equal(payload.data.exercises[0].targetWeight.value, 135);
          assert.equal(payload.meta.replayed, false);
        } finally {
          await server.close();
        }
      } finally {
        await disposeWorkoutInfrastructureTestContext(context);
      }
    }
  },
  {
    name: "POST /api/v1/sets/:setId/log logs a set",
    run: async () => {
      const context = await createWorkoutInfrastructureTestContext();

      try {
        await seedBaseWorkoutProgram(context);
        await seedInProgressWorkout(context, {
          setStatuses: ["pending", "pending", "pending"],
          actualReps: [0, 0, 0]
        });
        const server = await startHttpServer(context.db);

        try {
          const response = await fetch(`${server.baseUrl}/api/v1/sets/set-1/log`, {
            method: "POST",
            headers: createAuthHeaders({
              "content-type": "application/json",
              "Idempotency-Key": "log-http-key-1"
            }),
            body: JSON.stringify({
              actualReps: 8
            })
          });
          const payload = await readJson(response);

          assert.equal(response.status, 200);
          assert.equal(payload.data.set.status, "completed");
          assert.equal(payload.data.exerciseEntry.completedSetCount, 1);
          assert.equal(payload.meta.replayed, false);
        } finally {
          await server.close();
        }
      } finally {
        await disposeWorkoutInfrastructureTestContext(context);
      }
    }
  },
  {
    name: "POST /api/v1/workout-sessions/:sessionId/complete completes a workout and refreshes dashboard state",
    run: async () => {
      const context = await createWorkoutInfrastructureTestContext();

      try {
        await seedBaseWorkoutProgram(context);
        await seedInProgressWorkout(context);
        const server = await startHttpServer(context.db);

        try {
          const completeResponse = await fetch(`${server.baseUrl}/api/v1/workout-sessions/session-1/complete`, {
            method: "POST",
            headers: createAuthHeaders({
              "content-type": "application/json",
              "Idempotency-Key": "complete-http-key-1"
            }),
            body: JSON.stringify({
              completedAt: "2026-04-24T10:45:00.000Z",
              exerciseFeedback: [
                {
                  exerciseEntryId: "entry-1",
                  effortFeedback: "just_right"
                }
              ],
              userEffortFeedback: "just_right"
            })
          });
          const completePayload = await readJson(completeResponse);

          const dashboardResponse = await fetch(`${server.baseUrl}/api/v1/dashboard`, {
            headers: createAuthHeaders()
          });
          const dashboardPayload = await readJson(dashboardResponse);

          assert.equal(completeResponse.status, 200);
          assert.equal(completePayload.data.progressionUpdates[0].nextWeight.value, 140);
          assert.equal(completePayload.data.nextWorkoutTemplate.id, "template-2");
          assert.equal(dashboardResponse.status, 200);
          assert.equal(dashboardPayload.data.activeWorkoutSession, null);
          assert.equal(dashboardPayload.data.nextWorkoutTemplate.id, "template-2");
          assert.ok(
            dashboardPayload.data.recentWorkoutHistory[0].highlights.includes("Workout completed")
          );
        } finally {
          await server.close();
        }
      } finally {
        await disposeWorkoutInfrastructureTestContext(context);
      }
    }
  },
  {
    name: "Mutation routes require Idempotency-Key",
    run: async () => {
      const context = await createWorkoutInfrastructureTestContext();

      try {
        await seedBaseWorkoutProgram(context);
        const server = await startHttpServer(context.db);

        try {
          const response = await fetch(`${server.baseUrl}/api/v1/workout-sessions/start`, {
            method: "POST",
            headers: createAuthHeaders({
              "content-type": "application/json"
            }),
            body: JSON.stringify({})
          });
          const payload = await readJson(response);

          assert.equal(response.status, 400);
          assert.equal(payload.error.code, "VALIDATION_ERROR");
          assert.equal(payload.error.details[0].field, "Idempotency-Key");
        } finally {
          await server.close();
        }
      } finally {
        await disposeWorkoutInfrastructureTestContext(context);
      }
    }
  },
  {
    name: "Idempotency conflict returns 409",
    run: async () => {
      const context = await createWorkoutInfrastructureTestContext();

      try {
        await seedBaseWorkoutProgram(context);
        const server = await startHttpServer(context.db);

        try {
          const firstResponse = await fetch(`${server.baseUrl}/api/v1/workout-sessions/start`, {
            method: "POST",
            headers: createAuthHeaders({
              "content-type": "application/json",
              "Idempotency-Key": "shared-http-key"
            }),
            body: JSON.stringify({})
          });

          const conflictingResponse = await fetch(`${server.baseUrl}/api/v1/workout-sessions/start`, {
            method: "POST",
            headers: createAuthHeaders({
              "content-type": "application/json",
              "Idempotency-Key": "shared-http-key"
            }),
            body: JSON.stringify({
              workoutTemplateId: "template-2"
            })
          });
          const conflictingPayload = await readJson(conflictingResponse);

          assert.equal(firstResponse.status, 201);
          assert.equal(conflictingResponse.status, 409);
          assert.equal(conflictingPayload.error.code, "CONFLICT");
        } finally {
          await server.close();
        }
      } finally {
        await disposeWorkoutInfrastructureTestContext(context);
      }
    }
  }
];

workoutHttpTestCases.push(
  {
    name: "Missing bearer token returns 401",
    run: async () => {
      const context = await createWorkoutInfrastructureTestContext();

      try {
        await seedBaseWorkoutProgram(context);
        const server = await startHttpServer(context.db);

        try {
          const response = await fetch(`${server.baseUrl}/api/v1/dashboard`);
          const payload = await readJson(response);

          assert.equal(response.status, 401);
          assert.equal(payload.error.code, "UNAUTHENTICATED");
        } finally {
          await server.close();
        }
      } finally {
        await disposeWorkoutInfrastructureTestContext(context);
      }
    }
  },
  {
    name: "Invalid bearer token returns 401",
    run: async () => {
      const context = await createWorkoutInfrastructureTestContext();

      try {
        await seedBaseWorkoutProgram(context);
        const server = await startHttpServer(context.db);

        try {
          const response = await fetch(`${server.baseUrl}/api/v1/dashboard`, {
            headers: {
              Authorization: "Bearer invalid-token"
            }
          });
          const payload = await readJson(response);

          assert.equal(response.status, 401);
          assert.equal(payload.error.code, "UNAUTHENTICATED");
        } finally {
          await server.close();
        }
      } finally {
        await disposeWorkoutInfrastructureTestContext(context);
      }
    }
  },
  {
    name: "First authenticated request creates a local user",
    run: async () => {
      const context = await createWorkoutInfrastructureTestContext();

      try {
        const server = await startHttpServer(context.db);

        try {
          const before = await context.db.select().from(users);

          const response = await fetch(`${server.baseUrl}/api/v1/dashboard`, {
            headers: {
              Authorization: "Bearer valid-new-user-token"
            }
          });

          const after = await context.db.select().from(users);
          const createdUser = after.find((user) => user.authProviderId === "auth-user-new");

          assert.equal(response.status, 200);
          assert.equal(before.length, 0);
          assert.equal(after.length, 1);
          assert.ok(createdUser);
        } finally {
          await server.close();
        }
      } finally {
        await disposeWorkoutInfrastructureTestContext(context);
      }
    }
  },
  {
    name: "Second authenticated request reuses the same local user",
    run: async () => {
      const context = await createWorkoutInfrastructureTestContext();

      try {
        const server = await startHttpServer(context.db);

        try {
          const firstResponse = await fetch(`${server.baseUrl}/api/v1/dashboard`, {
            headers: {
              Authorization: "Bearer valid-new-user-token"
            }
          });

          const usersAfterFirstRequest = await context.db.select().from(users);
          const createdUser = usersAfterFirstRequest.find((user) => user.authProviderId === "auth-user-new");

          const secondResponse = await fetch(`${server.baseUrl}/api/v1/dashboard`, {
            headers: {
              Authorization: "Bearer valid-new-user-token"
            }
          });

          const usersAfterSecondRequest = await context.db.select().from(users);

          assert.equal(firstResponse.status, 200);
          assert.equal(secondResponse.status, 200);
          assert.ok(createdUser);
          assert.equal(usersAfterSecondRequest.length, 1);
          assert.ok(usersAfterSecondRequest[0]);
          assert.equal(usersAfterSecondRequest[0].id, createdUser.id);
        } finally {
          await server.close();
        }
      } finally {
        await disposeWorkoutInfrastructureTestContext(context);
      }
    }
  }
);
