import assert from "node:assert/strict";
import type { ApiErrorEnvelope } from "@fitness/shared";
import { apiRequest, buildApiUrl } from "../api/client.js";
import { normalizeApiBaseUrl } from "../api/config.js";
import {
  fetchDashboard,
  fetchProgression,
  fetchWorkoutHistory,
  fetchWorkoutHistoryDetail,
  addCustomWorkoutExercise,
  createCustomProgram,
  startWorkoutSession,
  logSet,
  completeWorkoutSession
} from "../api/workouts.js";
import { MobileApiError } from "../api/errors.js";
import { resolveStableIdempotencyKey } from "../features/workout/utils/idempotency.js";
import type { MobileTestCase } from "./mobile-test-case.js";

type MockFetchResponse = {
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
};

function setMockFetch(implementation: (input: RequestInfo | URL, init?: RequestInit) => Promise<MockFetchResponse>) {
  globalThis.fetch = implementation as typeof fetch;
}

export const mobileApiTestCases: MobileTestCase[] = [
  {
    name: "API base URL is normalized to include /api/v1 without trailing slashes",
    run: () => {
      assert.equal(
        normalizeApiBaseUrl("https://setwiseapi.vercel.app/"),
        "https://setwiseapi.vercel.app/api/v1"
      );
      assert.equal(
        normalizeApiBaseUrl("https://setwiseapi.vercel.app/api/v1/"),
        "https://setwiseapi.vercel.app/api/v1"
      );
      assert.equal(
        normalizeApiBaseUrl("http://localhost:4000/api/v1"),
        "http://localhost:4000/api/v1"
      );
    }
  },
  {
    name: "API client joins URLs without double slashes",
    run: () => {
      assert.equal(
        buildApiUrl("https://setwiseapi.vercel.app/api/v1/", "/dashboard"),
        "https://setwiseapi.vercel.app/api/v1/dashboard"
      );
      assert.equal(
        buildApiUrl("http://localhost:4000/api/v1", "dashboard"),
        "http://localhost:4000/api/v1/dashboard"
      );
    }
  },
  {
    name: "API client unwraps success envelopes",
    run: async () => {
      setMockFetch(async () => ({
        ok: true,
        status: 200,
        json: async () => ({
          data: {
            weeklyWorkoutCount: 2
          },
          meta: {}
        })
      }));

      const response = await apiRequest<{ weeklyWorkoutCount: number }>("/dashboard");
      assert.equal(response.data.weeklyWorkoutCount, 2);
    }
  },
  {
    name: "API client unwraps backend error envelopes",
    run: async () => {
      const errorPayload: ApiErrorEnvelope = {
        error: {
          code: "CONFLICT",
          message: "Conflict"
        }
      };

      setMockFetch(async () => ({
        ok: false,
        status: 409,
        json: async () => errorPayload
      }));

      await assert.rejects(
        () => apiRequest("/dashboard"),
        (error: unknown) => error instanceof MobileApiError && error.code === "CONFLICT"
      );
    }
  },
  {
    name: "Workout API functions send idempotency headers on mutations",
    run: async () => {
      const calls: RequestInit[] = [];

      setMockFetch(async (_input, init) => {
        calls.push(init ?? {});
        return {
          ok: true,
          status: 200,
          json: async () => ({
            data: {},
            meta: {
              replayed: false
            }
          })
        };
      });

      await fetchDashboard();
      await fetchProgression();
      await fetchWorkoutHistory(20);
      await fetchWorkoutHistoryDetail("session-1");
      await startWorkoutSession({
        request: {},
        idempotencyKey: "start-key"
      });
      await logSet({
        setId: "set-1",
        request: {
          actualReps: 8
        },
        idempotencyKey: "log-key"
      });
      await completeWorkoutSession({
        sessionId: "session-1",
        request: {
          exerciseFeedback: [
            {
              exerciseEntryId: "entry-1",
              effortFeedback: "just_right"
            }
          ]
        },
        idempotencyKey: "complete-key"
      });

      assert.equal((calls[0]?.headers as Record<string, string>)["Idempotency-Key"], undefined);
      assert.equal((calls[1]?.headers as Record<string, string>)["Idempotency-Key"], undefined);
      assert.equal((calls[2]?.headers as Record<string, string>)["Idempotency-Key"], undefined);
      assert.equal((calls[3]?.headers as Record<string, string>)["Idempotency-Key"], undefined);
      assert.equal((calls[4]?.headers as Record<string, string>)["Idempotency-Key"], "start-key");
      assert.equal((calls[5]?.headers as Record<string, string>)["Idempotency-Key"], "log-key");
      assert.equal((calls[6]?.headers as Record<string, string>)["Idempotency-Key"], "complete-key");
    }
  },
  {
    name: "Workout API sends partial completion payloads",
    run: async () => {
      let requestBody: string | undefined;

      setMockFetch(async (_input, init) => {
        requestBody = init?.body as string | undefined;
        return {
          ok: true,
          status: 200,
          json: async () => ({
            data: {},
            meta: {
              replayed: false
            }
          })
        };
      });

      await completeWorkoutSession({
        sessionId: "session-1",
        request: {
          exerciseFeedback: [],
          finishEarly: true
        },
        idempotencyKey: "complete-partial-key"
      });

      assert.deepEqual(JSON.parse(requestBody ?? "{}"), {
        exerciseFeedback: [],
        finishEarly: true
      });
    }
  },
  {
    name: "Workout API sends selected workout template when starting a chosen workout",
    run: async () => {
      let requestBody: string | undefined;

      setMockFetch(async (_input, init) => {
        requestBody = init?.body as string | undefined;
        return {
          ok: true,
          status: 201,
          json: async () => ({
            data: {},
            meta: {
              replayed: false
            }
          })
        };
      });

      await startWorkoutSession({
        request: {
          workoutTemplateId: "template-2"
        },
        idempotencyKey: "start-selected-key"
      });

      assert.deepEqual(JSON.parse(requestBody ?? "{}"), {
        workoutTemplateId: "template-2"
      });
    }
  },
  {
    name: "Workout API sends custom workout session type when starting a custom workout",
    run: async () => {
      let requestBody: string | undefined;

      setMockFetch(async (_input, init) => {
        requestBody = init?.body as string | undefined;
        return {
          ok: true,
          status: 201,
          json: async () => ({
            data: {},
            meta: {
              replayed: false
            }
          })
        };
      });

      await startWorkoutSession({
        request: {
          sessionType: "custom"
        },
        idempotencyKey: "start-custom-key"
      });

      assert.deepEqual(JSON.parse(requestBody ?? "{}"), {
        sessionType: "custom"
      });
    }
  },
  {
    name: "Workout API sends selected exercise details when adding to a custom workout",
    run: async () => {
      let requestPath: string | undefined;
      let requestBody: string | undefined;
      let idempotencyKey: string | null = null;

      setMockFetch(async (input, init) => {
        requestPath = input.toString();
        requestBody = init?.body as string | undefined;
        idempotencyKey =
          init?.headers && !(init.headers instanceof Headers)
            ? ((init.headers as Record<string, string>)["Idempotency-Key"] ?? null)
            : init?.headers instanceof Headers
              ? init.headers.get("Idempotency-Key")
              : null;
        return {
          ok: true,
          status: 201,
          json: async () => ({
            data: {},
            meta: {
              replayed: false
            }
          })
        };
      });

      await addCustomWorkoutExercise({
        sessionId: "session-1",
        request: {
          exerciseId: "exercise-1",
          targetSets: 3,
          targetReps: 8
        },
        idempotencyKey: "add-custom-exercise-key"
      });

      assert.match(requestPath ?? "", /\/workout-sessions\/session-1\/exercises$/);
      assert.equal(idempotencyKey, "add-custom-exercise-key");
      assert.deepEqual(JSON.parse(requestBody ?? "{}"), {
        exerciseId: "exercise-1",
        targetSets: 3,
        targetReps: 8
      });
    }
  },
  {
    name: "Workout API sends custom program payloads with idempotency",
    run: async () => {
      let requestPath: string | undefined;
      let requestBody: string | undefined;
      let idempotencyKey: string | null = null;

      setMockFetch(async (input, init) => {
        requestPath = input.toString();
        requestBody = init?.body as string | undefined;
        idempotencyKey =
          init?.headers && !(init.headers instanceof Headers)
            ? ((init.headers as Record<string, string>)["Idempotency-Key"] ?? null)
            : init?.headers instanceof Headers
              ? init.headers.get("Idempotency-Key")
              : null;
        return {
          ok: true,
          status: 201,
          json: async () => ({
            data: {
              program: {
                id: "program-custom-1"
              }
            },
            meta: {
              replayed: false
            }
          })
        };
      });

      await createCustomProgram({
        request: {
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
            }
          ]
        },
        idempotencyKey: "create-program-key"
      });

      assert.match(requestPath ?? "", /\/programs$/);
      assert.equal(idempotencyKey, "create-program-key");
      assert.deepEqual(JSON.parse(requestBody ?? "{}"), {
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
          }
        ]
      });
    }
  },
  {
    name: "Stable idempotency keys are reused only for the same payload",
    run: () => {
      const first = resolveStableIdempotencyKey({
        scope: "log-set:set-1",
        payload: {
          actualReps: 8
        }
      });

      const second = resolveStableIdempotencyKey({
        scope: "log-set:set-1",
        payload: {
          actualReps: 8
        },
        existing: first
      });

      const third = resolveStableIdempotencyKey({
        scope: "log-set:set-1",
        payload: {
          actualReps: 7
        },
        existing: second
      });

      assert.equal(first.key, second.key);
      assert.notEqual(second.key, third.key);
    }
  }
];
