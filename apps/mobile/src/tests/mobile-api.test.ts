import assert from "node:assert/strict";
import type { ApiErrorEnvelope } from "@fitness/shared";
import { apiRequest } from "../api/client.js";
import {
  fetchDashboard,
  fetchProgression,
  fetchWorkoutHistory,
  fetchWorkoutHistoryDetail,
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
