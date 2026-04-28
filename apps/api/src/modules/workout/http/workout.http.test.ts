import assert from "node:assert/strict";
import { createServer } from "node:http";
import { progressionStates, sets, users } from "@fitness/db";
import type { Request } from "express";
import { createApp } from "../../../app.js";
import { createAuthenticateRequestMiddleware } from "../../../lib/auth/auth.middleware.js";
import { issueAuthToken } from "../../../lib/auth/token.js";
import { AppError } from "../../../lib/http/errors.js";
import { DEV_USER_ID, bootstrapDevelopmentDatabase } from "../../../lib/db/dev-bootstrap.js";
import { createPgliteClient, createPgliteDatabase } from "../../../lib/db/connection.js";
import type { HttpTestCase } from "./test-helpers/http-test-case.js";
import { createWorkoutHttpRouter } from "./workout.module.js";
import {
  createWorkoutInfrastructureTestContext,
  disposeWorkoutInfrastructureTestContext,
  seedBaseWorkoutProgram,
  seedUpperLowerArmsProgram,
  seedInProgressWorkout
} from "../infrastructure/test-helpers/integration-db.js";

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
        request.authUser = { email: "user-1@example.com", userId: "user-1" };
        next();
        return;
      }

      if (token === "valid-new-user-token") {
        request.authUser = { email: "new-user@example.com", userId: "auth-user-new" };
        next();
        return;
      }

      if (token === "valid-dev-user-token") {
        request.authUser = { email: "dev-user@example.com", userId: DEV_USER_ID };
        next();
        return;
      }

      if (token === "exploding-token") {
        throw new Error("Token verification failed.");
      }

      next(new AppError(401, "UNAUTHENTICATED", "Authentication is required."));
    }
  };
}

async function startHttpServer(database: any, auth: ReturnType<typeof createTestAuth> | null = createTestAuth()) {
  const app = createApp({
    ...(auth ? { auth } : {}),
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
    name: "Auth middleware accepts a valid app token",
    run: async () => {
      const warnings: Array<Record<string, unknown>> = [];
      const token = issueAuthToken({ email: "user-1@example.com", userId: "user-1" });
      const middleware = createAuthenticateRequestMiddleware(
        {
          logger: {
            error: () => {},
            info: () => {},
            warn: (_message, context) => {
              warnings.push(context ?? {});
            }
          }
        }
      );
      const request: { authUser?: { email: string; userId: string }; header: (name: string) => string | undefined } = {
        header(name: string) {
          return name.toLowerCase() === "authorization" ? `Bearer ${token}` : undefined;
        }
      };

      await new Promise<void>((resolve, reject) => {
        middleware(request as unknown as Request, {} as any, (error?: unknown) => {
          if (error) {
            reject(error);
            return;
          }

          resolve();
        });
      });

      assert.equal(request.authUser?.userId, "user-1");
      assert.equal(warnings.length, 0);
    }
  },
  {
    name: "Auth middleware logs safe diagnostics on token verification failure",
    run: async () => {
      const warnings: Array<{ message: string; context?: Record<string, unknown> }> = [];
      const middleware = createAuthenticateRequestMiddleware(
        {
          logger: {
            error: () => {},
            info: () => {},
            warn: (message, context) => {
              warnings.push(context ? { context, message } : { message });
            }
          }
        }
      );
      const request = {
        header(name: string) {
          return name.toLowerCase() === "authorization" ? "Bearer invalid-token" : undefined;
        }
      };

      const error = await new Promise<unknown>((resolve) => {
        middleware(request as unknown as Request, {} as any, (nextError?: unknown) => {
          resolve(nextError);
        });
      });

      assert.ok(error instanceof Error);
      assert.equal(warnings.length, 1);
      assert.equal(warnings[0]?.message, "API auth token verification failed");
      assert.equal(warnings[0]?.context?.authorizationHeaderPresent, true);
      assert.equal(warnings[0]?.context?.bearerTokenPresent, true);
      assert.equal(warnings[0]?.context?.verificationErrorName, "Error");
      assert.equal(typeof warnings[0]?.context?.verificationErrorMessage, "string");
      assert.equal("token" in (warnings[0]?.context ?? {}), false);
    }
  },
  {
    name: "POST /api/v1/auth/signup, signin, and me work",
    run: async () => {
      const context = await createWorkoutInfrastructureTestContext();

      try {
        const server = await startHttpServer(context.db, null);

        try {
          const signupResponse = await fetch(`${server.baseUrl}/api/v1/auth/signup`, {
            body: JSON.stringify({ email: "mvp@example.com", password: "password123" }),
            headers: { "Content-Type": "application/json" },
            method: "POST"
          });
          const signupPayload = await readJson(signupResponse);

          assert.equal(signupResponse.status, 201);
          assert.equal(signupPayload.data.user.email, "mvp@example.com");
          assert.equal(typeof signupPayload.data.token, "string");

          const signinResponse = await fetch(`${server.baseUrl}/api/v1/auth/signin`, {
            body: JSON.stringify({ email: "mvp@example.com", password: "password123" }),
            headers: { "Content-Type": "application/json" },
            method: "POST"
          });
          const signinPayload = await readJson(signinResponse);

          assert.equal(signinResponse.status, 200);
          assert.equal(typeof signinPayload.data.token, "string");

          const meResponse = await fetch(`${server.baseUrl}/api/v1/auth/me`, {
            headers: { Authorization: `Bearer ${signinPayload.data.token}` }
          });
          const mePayload = await readJson(meResponse);

          assert.equal(meResponse.status, 200);
          assert.equal(mePayload.data.user.email, "mvp@example.com");
        } finally {
          await server.close();
        }
      } finally {
        await disposeWorkoutInfrastructureTestContext(context);
      }
    }
  },
  {
    name: "GET /api/v1/dashboard returns dashboard data",
    run: async () => {
      const context = await createWorkoutInfrastructureTestContext();

      try {
        await seedBaseWorkoutProgram(context);
        await seedUpperLowerArmsProgram(context);
        const server = await startHttpServer(context.db);

        try {
          const response = await fetch(`${server.baseUrl}/api/v1/dashboard`, {
            headers: createAuthHeaders()
          });
          const payload = await readJson(response);

          assert.equal(response.status, 200);
          assert.equal(payload.data.nextWorkoutTemplate.id, "template-1");
          assert.equal(payload.data.activeProgram.currentPosition.label, "Week 1 · Day 1");
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
        await seedUpperLowerArmsProgram(context);
        const server = await startHttpServer(context.db);

        try {
          const response = await fetch(`${server.baseUrl}/api/v1/programs`, {
            headers: createAuthHeaders()
          });
          const payload = await readJson(response);

          assert.equal(response.status, 200);
          assert.equal(payload.data.programs.length, 2);
          assert.equal(payload.data.programs[0].name, "Beginner Full Body V1");
          assert.equal(payload.data.programs[0].workouts[0].name, "Workout A");
          assert.equal(payload.data.programs[0].workouts[0].exercises[0].exerciseName, "Bench Press");
          assert.equal(payload.data.programs[1].name, "4-Day Upper/Lower + Arms");
          assert.equal(payload.data.programs[1].daysPerWeek, 4);
          assert.equal(payload.data.programs[1].workouts.length, 4);
          assert.equal(payload.data.programs[1].workouts[0].name, "Day 1 - Upper Strength");
          assert.equal(payload.data.programs[1].workouts[0].exercises[1].exerciseName, "Pull-Ups");
          assert.equal(payload.data.programs[1].workouts[0].exercises[1].targetReps, 8);
          assert.equal(payload.data.programs[1].workouts[3].exercises[0].exerciseName, "DB Curl");
          assert.equal(payload.data.programs[1].workouts[3].exercises[0].targetSets, 3);
        } finally {
          await server.close();
        }
      } finally {
        await disposeWorkoutInfrastructureTestContext(context);
      }
    }
  },
  {
    name: "GET /api/v1/programs returns development bootstrap catalog",
    run: async () => {
      const client = createPgliteClient();

      try {
        await bootstrapDevelopmentDatabase(client as any);
        const database = createPgliteDatabase(client);
        const server = await startHttpServer(database);

        try {
          const response = await fetch(`${server.baseUrl}/api/v1/programs`, {
            headers: {
              Authorization: "Bearer valid-dev-user-token"
            }
          });
          const payload = await readJson(response);

          assert.equal(response.status, 200);
          assert.deepEqual(
            payload.data.programs.map((program: { name: string }) => program.name),
            ["Beginner Full Body V1", "4-Day Upper/Lower + Arms"]
          );
          assert.equal(payload.data.programs[1].workouts.length, 4);
        } finally {
          await server.close();
        }
      } finally {
        await client.close();
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
    name: "POST /api/v1/programs/:programId/follow can select upper/lower arms program",
    run: async () => {
      const context = await createWorkoutInfrastructureTestContext();

      try {
        await seedBaseWorkoutProgram(context);
        await seedUpperLowerArmsProgram(context);
        const server = await startHttpServer(context.db);

        try {
          const followResponse = await fetch(`${server.baseUrl}/api/v1/programs/program-2/follow`, {
            method: "POST",
            headers: {
              Authorization: "Bearer valid-new-user-token"
            }
          });
          const followPayload = await readJson(followResponse);

          assert.equal(followResponse.status, 201);
          assert.equal(followPayload.data.activeProgram.program.id, "program-2");
          assert.equal(followPayload.data.activeProgram.program.name, "4-Day Upper/Lower + Arms");
          assert.equal(followPayload.data.activeProgram.nextWorkoutTemplate.id, "template-3");

          const startResponse = await fetch(`${server.baseUrl}/api/v1/workout-sessions/start`, {
            method: "POST",
            headers: {
              Authorization: "Bearer valid-new-user-token",
              "content-type": "application/json",
              "Idempotency-Key": "start-upper-lower-arms-key"
            },
            body: JSON.stringify({})
          });
          const startPayload = await readJson(startResponse);

          assert.equal(startResponse.status, 201);
          assert.equal(startPayload.data.programName, "4-Day Upper/Lower + Arms");
          assert.equal(startPayload.data.workoutName, "Day 1 - Upper Strength");
          assert.equal(startPayload.data.exercises.length, 5);
          assert.equal(startPayload.data.exercises[1].exerciseName, "Pull-Ups");
          assert.equal(startPayload.data.exercises[1].targetSets, 3);
          assert.equal(startPayload.data.exercises[1].targetReps, 8);
          assert.equal(startPayload.data.exercises[1].sets.length, 3);
          assert.equal(startPayload.data.exercises[3].exerciseName, "DB Curl");
          assert.equal(startPayload.data.exercises[3].targetSets, 2);
          assert.equal(startPayload.data.exercises[3].targetReps, 12);

          let logIndex = 0;
          for (const exercise of startPayload.data.exercises) {
            for (const set of exercise.sets) {
              logIndex += 1;
              const logResponse = await fetch(`${server.baseUrl}/api/v1/sets/${set.id}/log`, {
                method: "POST",
                headers: {
                  Authorization: "Bearer valid-new-user-token",
                  "content-type": "application/json",
                  "Idempotency-Key": `log-upper-lower-arms-key-${logIndex}`
                },
                body: JSON.stringify({
                  actualReps: set.targetReps
                })
              });
              const logPayload = await readJson(logResponse);

              assert.equal(logResponse.status, 200);
              assert.equal(logPayload.data.set.status, "completed");
            }
          }

          const completeResponse = await fetch(
            `${server.baseUrl}/api/v1/workout-sessions/${startPayload.data.id}/complete`,
            {
              method: "POST",
              headers: {
                Authorization: "Bearer valid-new-user-token",
                "content-type": "application/json",
                "Idempotency-Key": "complete-upper-lower-arms-key"
              },
              body: JSON.stringify({
                completedAt: "2026-04-24T11:00:00.000Z",
                exerciseFeedback: startPayload.data.exercises.map((exercise: any) => ({
                  exerciseEntryId: exercise.id,
                  effortFeedback: "just_right"
                })),
                userEffortFeedback: "just_right"
              })
            }
          );
          const completePayload = await readJson(completeResponse);

          assert.equal(completeResponse.status, 200);
          assert.equal(completePayload.data.workoutSession.status, "completed");

          const historyResponse = await fetch(
            `${server.baseUrl}/api/v1/workout-history?limit=20&status=completed`,
            {
              headers: {
                Authorization: "Bearer valid-new-user-token"
              }
            }
          );
          const historyPayload = await readJson(historyResponse);

          assert.equal(historyResponse.status, 200);
          assert.equal(historyPayload.data.items[0].programName, "4-Day Upper/Lower + Arms");
          assert.equal(historyPayload.data.items[0].completedSetCount, 12);
        } finally {
          await server.close();
        }
      } finally {
        await disposeWorkoutInfrastructureTestContext(context);
      }
    }
  },
  {
    name: "Custom programs can be created, listed, followed, and started only by their owner",
    run: async () => {
      const context = await createWorkoutInfrastructureTestContext();

      try {
        await seedBaseWorkoutProgram(context);
        await seedUpperLowerArmsProgram(context);
        const server = await startHttpServer(context.db);

        try {
          const createResponse = await fetch(`${server.baseUrl}/api/v1/programs`, {
            method: "POST",
            headers: createAuthHeaders({
              "content-type": "application/json",
              "Idempotency-Key": "create-ppl-program-http-key"
            }),
            body: JSON.stringify({
              name: "Push Pull Legs",
              workouts: [
                {
                  name: "Push",
                  exercises: [
                    {
                      exerciseId: "exercise-1",
                      targetSets: 3,
                      targetReps: 8
                    }
                  ]
                },
                {
                  name: "Pull",
                  exercises: [
                    {
                      exerciseId: "exercise-3",
                      targetSets: 3,
                      targetReps: 10
                    }
                  ]
                },
                {
                  name: "Legs",
                  exercises: [
                    {
                      exerciseId: "exercise-2",
                      targetSets: 4,
                      targetReps: 6
                    }
                  ]
                }
              ]
            })
          });
          const createPayload = await readJson(createResponse);
          const programId = createPayload.data.program.id;

          const listResponse = await fetch(`${server.baseUrl}/api/v1/programs`, {
            headers: createAuthHeaders()
          });
          const listPayload = await readJson(listResponse);

          const otherUserListResponse = await fetch(`${server.baseUrl}/api/v1/programs`, {
            headers: {
              Authorization: "Bearer valid-new-user-token"
            }
          });
          const otherUserListPayload = await readJson(otherUserListResponse);

          const otherUserDetailResponse = await fetch(`${server.baseUrl}/api/v1/programs/${programId}`, {
            headers: {
              Authorization: "Bearer valid-new-user-token"
            }
          });

          const followResponse = await fetch(`${server.baseUrl}/api/v1/programs/${programId}/follow`, {
            method: "POST",
            headers: createAuthHeaders()
          });
          const followPayload = await readJson(followResponse);

          const dashboardResponse = await fetch(`${server.baseUrl}/api/v1/dashboard`, {
            headers: createAuthHeaders()
          });
          const dashboardPayload = await readJson(dashboardResponse);

          const startResponse = await fetch(`${server.baseUrl}/api/v1/workout-sessions/start`, {
            method: "POST",
            headers: createAuthHeaders({
              "content-type": "application/json",
              "Idempotency-Key": "start-ppl-program-http-key"
            }),
            body: JSON.stringify({})
          });
          const startPayload = await readJson(startResponse);

          assert.equal(createResponse.status, 201);
          assert.equal(createPayload.data.program.source, "custom");
          assert.equal(createPayload.data.program.name, "Push Pull Legs");
          assert.equal(createPayload.data.program.workouts.length, 3);
          assert.equal(createPayload.data.program.workouts[0].name, "Push");
          assert.equal(createPayload.data.program.workouts[0].exercises[0].targetSets, 3);
          assert.equal(createPayload.data.program.workouts[1].exercises[0].targetReps, 10);
          assert.equal(listResponse.status, 200);
          assert.ok(
            listPayload.data.programs.some((program: { id: string; source: string }) => program.id === programId && program.source === "custom")
          );
          assert.equal(otherUserListResponse.status, 200);
          assert.equal(
            otherUserListPayload.data.programs.some((program: { id: string }) => program.id === programId),
            false
          );
          assert.equal(otherUserDetailResponse.status, 404);
          assert.equal(followResponse.status, 201);
          assert.equal(followPayload.data.activeProgram.program.id, programId);
          assert.equal(followPayload.data.activeProgram.nextWorkoutTemplate.name, "Push");
          assert.equal(dashboardResponse.status, 200);
          assert.equal(dashboardPayload.data.activeProgram.program.name, "Push Pull Legs");
          assert.equal(dashboardPayload.data.nextWorkoutTemplate.name, "Push");
          assert.equal(startResponse.status, 201);
          assert.equal(startPayload.data.programName, "Push Pull Legs");
          assert.equal(startPayload.data.workoutName, "Push");
          assert.equal(startPayload.data.exercises[0].exerciseName, "Bench Press");
          assert.equal(startPayload.data.exercises[0].targetSets, 3);
          assert.equal(startPayload.data.exercises[0].targetReps, 8);
          assert.equal(startPayload.data.exercises[0].sets.length, 3);
        } finally {
          await server.close();
        }
      } finally {
        await disposeWorkoutInfrastructureTestContext(context);
      }
    }
  },
  {
    name: "POST /api/v1/programs validates custom program input",
    run: async () => {
      const context = await createWorkoutInfrastructureTestContext();

      try {
        await seedBaseWorkoutProgram(context);
        const server = await startHttpServer(context.db);

        try {
          const response = await fetch(`${server.baseUrl}/api/v1/programs`, {
            method: "POST",
            headers: createAuthHeaders({
              "content-type": "application/json",
              "Idempotency-Key": "create-invalid-program-http-key"
            }),
            body: JSON.stringify({
              name: "Invalid Program",
              workouts: [
                {
                  name: "Day 1",
                  exercises: [
                    {
                      exerciseId: "exercise-1",
                      targetSets: 0,
                      targetReps: 8
                    }
                  ]
                }
              ]
            })
          });
          const payload = await readJson(response);

          assert.equal(response.status, 400);
          assert.equal(payload.error.code, "VALIDATION_ERROR");
        } finally {
          await server.close();
        }
      } finally {
        await disposeWorkoutInfrastructureTestContext(context);
      }
    }
  },
  {
    name: "POST /api/v1/programs/:programId/follow switches active program when no workout is in progress",
    run: async () => {
      const context = await createWorkoutInfrastructureTestContext();

      try {
        await seedBaseWorkoutProgram(context);
        await seedUpperLowerArmsProgram(context);
        const server = await startHttpServer(context.db);

        try {
          const switchResponse = await fetch(`${server.baseUrl}/api/v1/programs/program-2/follow`, {
            method: "POST",
            headers: createAuthHeaders()
          });
          const switchPayload = await readJson(switchResponse);

          const dashboardResponse = await fetch(`${server.baseUrl}/api/v1/dashboard`, {
            headers: createAuthHeaders()
          });
          const dashboardPayload = await readJson(dashboardResponse);

          const startResponse = await fetch(`${server.baseUrl}/api/v1/workout-sessions/start`, {
            method: "POST",
            headers: createAuthHeaders({
              "content-type": "application/json",
              "Idempotency-Key": "start-after-program-switch-key"
            }),
            body: JSON.stringify({})
          });
          const startPayload = await readJson(startResponse);

          assert.equal(switchResponse.status, 201);
          assert.equal(switchPayload.data.activeProgram.program.name, "4-Day Upper/Lower + Arms");
          assert.equal(switchPayload.data.activeProgram.nextWorkoutTemplate.id, "template-3");
          assert.equal(dashboardResponse.status, 200);
          assert.equal(dashboardPayload.data.activeProgram.program.name, "4-Day Upper/Lower + Arms");
          assert.equal(dashboardPayload.data.nextWorkoutTemplate.id, "template-3");
          assert.equal(startResponse.status, 201);
          assert.equal(startPayload.data.programName, "4-Day Upper/Lower + Arms");
          assert.equal(startPayload.data.workoutName, "Day 1 - Upper Strength");
        } finally {
          await server.close();
        }
      } finally {
        await disposeWorkoutInfrastructureTestContext(context);
      }
    }
  },
  {
    name: "POST /api/v1/programs/:programId/follow prevents switching with an active workout",
    run: async () => {
      const context = await createWorkoutInfrastructureTestContext();

      try {
        await seedBaseWorkoutProgram(context);
        await seedUpperLowerArmsProgram(context);
        await seedInProgressWorkout(context, {
          setStatuses: ["pending", "pending", "pending"],
          actualReps: [0, 0, 0]
        });
        const server = await startHttpServer(context.db);

        try {
          const response = await fetch(`${server.baseUrl}/api/v1/programs/program-2/follow`, {
            method: "POST",
            headers: createAuthHeaders()
          });
          const payload = await readJson(response);

          const dashboardResponse = await fetch(`${server.baseUrl}/api/v1/dashboard`, {
            headers: createAuthHeaders()
          });
          const dashboardPayload = await readJson(dashboardResponse);

          assert.equal(response.status, 409);
          assert.equal(payload.error.code, "CONFLICT");
          assert.match(payload.error.message, /active workout/i);
          assert.equal(dashboardResponse.status, 200);
          assert.equal(dashboardPayload.data.activeProgram.program.name, "Beginner Full Body V1");
          assert.equal(dashboardPayload.data.activeWorkoutSession.id, "session-1");
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
    name: "POST /api/v1/workout-sessions/start starts a selected workout from the active program",
    run: async () => {
      const context = await createWorkoutInfrastructureTestContext();

      try {
        await seedBaseWorkoutProgram(context);
        await seedUpperLowerArmsProgram(context);
        const server = await startHttpServer(context.db);

        try {
          const followResponse = await fetch(`${server.baseUrl}/api/v1/programs/program-2/follow`, {
            method: "POST",
            headers: {
              Authorization: "Bearer valid-new-user-token"
            }
          });
          const followPayload = await readJson(followResponse);

          const startResponse = await fetch(`${server.baseUrl}/api/v1/workout-sessions/start`, {
            method: "POST",
            headers: {
              Authorization: "Bearer valid-new-user-token",
              "content-type": "application/json",
              "Idempotency-Key": "start-selected-workout-http-key"
            },
            body: JSON.stringify({
              workoutTemplateId: "template-4"
            })
          });
          const startPayload = await readJson(startResponse);

          let logIndex = 0;
          for (const exercise of startPayload.data.exercises) {
            for (const set of exercise.sets) {
              logIndex += 1;
              const logResponse = await fetch(`${server.baseUrl}/api/v1/sets/${set.id}/log`, {
                method: "POST",
                headers: {
                  Authorization: "Bearer valid-new-user-token",
                  "content-type": "application/json",
                  "Idempotency-Key": `log-selected-workout-http-key-${logIndex}`
                },
                body: JSON.stringify({
                  actualReps: set.targetReps
                })
              });

              assert.equal(logResponse.status, 200);
            }
          }

          const completeResponse = await fetch(
            `${server.baseUrl}/api/v1/workout-sessions/${startPayload.data.id}/complete`,
            {
              method: "POST",
              headers: {
                Authorization: "Bearer valid-new-user-token",
                "content-type": "application/json",
                "Idempotency-Key": "complete-selected-workout-http-key"
              },
              body: JSON.stringify({
                completedAt: "2026-04-24T11:00:00.000Z",
                exerciseFeedback: startPayload.data.exercises.map((exercise: any) => ({
                  exerciseEntryId: exercise.id,
                  effortFeedback: "just_right"
                })),
                userEffortFeedback: "just_right"
              })
            }
          );
          const completePayload = await readJson(completeResponse);

          const historyResponse = await fetch(
            `${server.baseUrl}/api/v1/workout-history?limit=20&status=completed`,
            {
              headers: {
                Authorization: "Bearer valid-new-user-token"
              }
            }
          );
          const historyPayload = await readJson(historyResponse);

          const historyDetailResponse = await fetch(
            `${server.baseUrl}/api/v1/workout-history/${startPayload.data.id}`,
            {
              headers: {
                Authorization: "Bearer valid-new-user-token"
              }
            }
          );
          const historyDetailPayload = await readJson(historyDetailResponse);

          const progressionResponse = await fetch(`${server.baseUrl}/api/v1/progression`, {
            headers: {
              Authorization: "Bearer valid-new-user-token"
            }
          });
          const progressionPayload = await readJson(progressionResponse);

          assert.equal(followResponse.status, 201);
          assert.equal(followPayload.data.activeProgram.nextWorkoutTemplate.id, "template-3");
          assert.equal(startResponse.status, 201);
          assert.equal(startPayload.data.workoutTemplateId, "template-4");
          assert.equal(startPayload.data.workoutName, "Day 2 - Lower");
          assert.equal(startPayload.data.exercises.length, 3);
          assert.equal(completeResponse.status, 200);
          assert.equal(completePayload.data.workoutSession.status, "completed");
          assert.equal(completePayload.data.nextWorkoutTemplate.id, "template-5");
          assert.equal(historyResponse.status, 200);
          assert.equal(historyPayload.data.items[0].workoutName, "Day 2 - Lower");
          assert.equal(historyPayload.data.items[0].completedSetCount, 7);
          assert.equal(historyDetailResponse.status, 200);
          assert.equal(historyDetailPayload.data.workoutSession.workoutTemplateId, "template-4");
          assert.equal(progressionResponse.status, 200);
          assert.equal(progressionPayload.data.totalCompletedWorkouts, 1);
        } finally {
          await server.close();
        }
      } finally {
        await disposeWorkoutInfrastructureTestContext(context);
      }
    }
  },
  {
    name: "POST /api/v1/workout-sessions/start starts a custom workout without an active enrollment",
    run: async () => {
      const context = await createWorkoutInfrastructureTestContext();

      try {
        await seedBaseWorkoutProgram(context);
        const server = await startHttpServer(context.db);

        try {
          const startResponse = await fetch(`${server.baseUrl}/api/v1/workout-sessions/start`, {
            method: "POST",
            headers: {
              Authorization: "Bearer valid-new-user-token",
              "content-type": "application/json",
              "Idempotency-Key": "start-custom-http-key"
            },
            body: JSON.stringify({
              sessionType: "custom"
            })
          });
          const startPayload = await readJson(startResponse);

          assert.equal(startResponse.status, 201);
          assert.equal(startPayload.data.sessionType, "custom");
          assert.equal(startPayload.data.workoutName, "Custom Workout");
          assert.equal(startPayload.data.exercises.length, 0);

          const addExerciseResponse = await fetch(
            `${server.baseUrl}/api/v1/workout-sessions/${startPayload.data.id}/exercises`,
            {
              method: "POST",
              headers: {
                Authorization: "Bearer valid-new-user-token",
                "content-type": "application/json",
                "Idempotency-Key": "add-custom-exercise-http-key"
              },
              body: JSON.stringify({
                exerciseId: "exercise-1",
                targetSets: 3,
                targetReps: 8
              })
            }
          );
          const addExercisePayload = await readJson(addExerciseResponse);

          const completeResponse = await fetch(
            `${server.baseUrl}/api/v1/workout-sessions/${startPayload.data.id}/complete`,
            {
              method: "POST",
              headers: {
                Authorization: "Bearer valid-new-user-token",
                "content-type": "application/json",
                "Idempotency-Key": "complete-custom-http-key"
              },
              body: JSON.stringify({
                exerciseFeedback: [],
                finishEarly: true
              })
            }
          );
          const completePayload = await readJson(completeResponse);

          const historyResponse = await fetch(`${server.baseUrl}/api/v1/workout-history?limit=20&status=completed`, {
            headers: {
              Authorization: "Bearer valid-new-user-token"
            }
          });
          const historyPayload = await readJson(historyResponse);

          assert.equal(addExerciseResponse.status, 201);
          assert.equal(addExercisePayload.data.exercises.length, 1);
          assert.equal(addExercisePayload.data.exercises[0].exerciseName, "Bench Press");
          assert.equal(addExercisePayload.data.exercises[0].sets.length, 3);
          assert.equal(completeResponse.status, 200);
          assert.equal(completePayload.data.workoutSession.sessionType, "custom");
          assert.equal(completePayload.data.workoutSession.exercises.length, 1);
          assert.equal(completePayload.data.nextWorkoutTemplate, null);
          assert.equal(historyResponse.status, 200);
          assert.equal(historyPayload.data.items[0].programName, "Custom Workout");
          assert.equal(historyPayload.data.items[0].exerciseCount, 1);
        } finally {
          await server.close();
        }
      } finally {
        await disposeWorkoutInfrastructureTestContext(context);
      }
    }
  },
  {
    name: "POST /api/v1/workout-sessions/start rejects a selected workout outside the active program",
    run: async () => {
      const context = await createWorkoutInfrastructureTestContext();

      try {
        await seedBaseWorkoutProgram(context);
        await seedUpperLowerArmsProgram(context);
        const server = await startHttpServer(context.db);

        try {
          const response = await fetch(`${server.baseUrl}/api/v1/workout-sessions/start`, {
            method: "POST",
            headers: createAuthHeaders({
              "content-type": "application/json",
              "Idempotency-Key": "start-invalid-selected-workout-http-key"
            }),
            body: JSON.stringify({
              workoutTemplateId: "template-3"
            })
          });
          const payload = await readJson(response);

          assert.equal(response.status, 404);
          assert.equal(payload.error.code, "NOT_FOUND");
          assert.match(payload.error.message, /active program/i);
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
    name: "POST and DELETE set mutations update an active workout exercise",
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
          const addResponse = await fetch(
            `${server.baseUrl}/api/v1/workout-sessions/session-1/exercises/entry-1/sets`,
            {
              method: "POST",
              headers: createAuthHeaders({
                "content-type": "application/json",
                "Idempotency-Key": "add-set-http-key-1"
              }),
              body: JSON.stringify({})
            }
          );
          const addPayload = await readJson(addResponse);
          const addedSet = addPayload.data.exercises[0].sets[3];

          const deleteResponse = await fetch(`${server.baseUrl}/api/v1/sets/${addedSet.id}`, {
            method: "DELETE",
            headers: createAuthHeaders({
              "content-type": "application/json",
              "Idempotency-Key": "delete-set-http-key-1"
            }),
            body: JSON.stringify({})
          });
          const deletePayload = await readJson(deleteResponse);
          const setRows = await context.db.select().from(sets);

          assert.equal(addResponse.status, 201);
          assert.equal(addPayload.data.exercises[0].targetSets, 4);
          assert.equal(addPayload.data.exercises[0].sets.length, 4);
          assert.equal(addedSet.setNumber, 4);
          assert.equal(addedSet.status, "pending");
          assert.equal(deleteResponse.status, 200);
          assert.equal(deletePayload.data.exercises[0].targetSets, 3);
          assert.equal(deletePayload.data.exercises[0].sets.length, 3);
          assert.equal(setRows.length, 3);
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
          const historyResponse = await fetch(`${server.baseUrl}/api/v1/workout-history?limit=20&status=completed`, {
            headers: createAuthHeaders()
          });
          const historyPayload = await readJson(historyResponse);
          const historyDetailResponse = await fetch(`${server.baseUrl}/api/v1/workout-history/session-1`, {
            headers: createAuthHeaders()
          });
          const historyDetailPayload = await readJson(historyDetailResponse);
          const progressionResponse = await fetch(`${server.baseUrl}/api/v1/progression`, {
            headers: createAuthHeaders()
          });
          const progressionPayload = await readJson(progressionResponse);

          assert.equal(completeResponse.status, 200);
          assert.equal(completePayload.data.progressionUpdates[0].nextWeight.value, 140);
          assert.equal(completePayload.data.nextWorkoutTemplate.id, "template-2");
          assert.equal(dashboardResponse.status, 200);
          assert.equal(dashboardPayload.data.activeWorkoutSession, null);
          assert.equal(dashboardPayload.data.nextWorkoutTemplate.id, "template-2");
          assert.equal(dashboardPayload.data.activeProgram.currentPosition.label, "Week 1 · Day 2");
          assert.ok(
            dashboardPayload.data.recentWorkoutHistory[0].highlights.includes("Workout completed")
          );
          assert.equal(historyResponse.status, 200);
          assert.equal(historyPayload.data.items[0].id, "session-1");
          assert.equal(historyPayload.data.items[0].workoutName, "Workout A");
          assert.equal(historyPayload.data.items[0].programName, "Beginner Full Body V1");
          assert.equal(historyPayload.data.items[0].exerciseCount, 1);
          assert.equal(historyPayload.data.items[0].completedSetCount, 3);
          assert.ok(historyPayload.data.items[0].highlights.includes("Workout completed"));
          assert.equal(historyPayload.data.nextCursor, null);
          assert.equal(historyDetailResponse.status, 200);
          assert.equal(historyDetailPayload.data.workoutSession.id, "session-1");
          assert.equal(historyDetailPayload.data.workoutSession.exercises[0].sets.length, 3);
          assert.equal(historyDetailPayload.data.workoutSession.exercises[0].sets[0].actualReps, 8);
          assert.equal(progressionResponse.status, 200);
          assert.equal(progressionPayload.data.totalCompletedWorkouts, 1);
          assert.equal(progressionPayload.data.recentWorkoutVolume[0].totalVolume.value, 3240);
          assert.equal(progressionPayload.data.exercises[0].exerciseName, "Bench Press");
          assert.equal(progressionPayload.data.exercises[0].recentBestWeight.value, 135);
        } finally {
          await server.close();
        }
      } finally {
        await disposeWorkoutInfrastructureTestContext(context);
      }
    }
  },
  {
    name: "POST /api/v1/workout-sessions/:sessionId/complete finishes a partial workout without fabricating sets",
    run: async () => {
      const context = await createWorkoutInfrastructureTestContext();

      try {
        await seedBaseWorkoutProgram(context);
        await seedInProgressWorkout(context, {
          setStatuses: ["completed", "pending", "pending"],
          actualReps: [8, 0, 0]
        });
        const server = await startHttpServer(context.db);

        try {
          const completeResponse = await fetch(`${server.baseUrl}/api/v1/workout-sessions/session-1/complete`, {
            method: "POST",
            headers: createAuthHeaders({
              "content-type": "application/json",
              "Idempotency-Key": "complete-http-key-partial-1"
            }),
            body: JSON.stringify({
              completedAt: "2026-04-24T10:25:00.000Z",
              exerciseFeedback: [],
              finishEarly: true
            })
          });
          const completePayload = await readJson(completeResponse);

          const historyResponse = await fetch(`${server.baseUrl}/api/v1/workout-history?limit=20&status=completed`, {
            headers: createAuthHeaders()
          });
          const historyPayload = await readJson(historyResponse);
          const historyDetailResponse = await fetch(`${server.baseUrl}/api/v1/workout-history/session-1`, {
            headers: createAuthHeaders()
          });
          const historyDetailPayload = await readJson(historyDetailResponse);
          const setRows = await context.db.select().from(sets);
          const progressionRows = await context.db.select().from(progressionStates);

          assert.equal(completeResponse.status, 200);
          assert.equal(completePayload.data.workoutSession.isPartial, true);
          assert.equal(completePayload.data.progressionUpdates.length, 0);
          assert.equal(historyResponse.status, 200);
          assert.equal(historyPayload.data.items[0].isPartial, true);
          assert.equal(historyPayload.data.items[0].plannedSetCount, 3);
          assert.equal(historyPayload.data.items[0].completedSetCount, 1);
          assert.equal(historyDetailResponse.status, 200);
          assert.equal(historyDetailPayload.data.workoutSession.isPartial, true);
          assert.deepEqual(
            historyDetailPayload.data.workoutSession.exercises[0].sets.map((set: { status: string }) => set.status),
            ["completed", "pending", "pending"]
          );
          assert.equal(setRows.length, 3);
          assert.equal(setRows.filter((set) => set.status === "pending").length, 2);
          assert.equal(setRows.filter((set) => set.status === "skipped").length, 0);
          assert.equal(progressionRows[0]?.currentWeightLbs, "135.00");
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
