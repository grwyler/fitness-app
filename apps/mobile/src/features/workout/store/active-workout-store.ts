import type { CompleteWorkoutSessionResponse, EffortFeedback } from "@fitness/shared";
import { create } from "zustand";
import type { SetLogDraft } from "../utils/set-logging.shared";
import { resolveStableIdempotencyKey } from "../utils/idempotency";

type StoredKey = {
  key: string;
  fingerprint: string;
};

type ActiveWorkoutState = {
  activeSessionId: string | null;
  exerciseFeedbackByEntryId: Record<string, EffortFeedback>;
  idempotencyKeys: Record<string, StoredKey>;
  latestSummary: CompleteWorkoutSessionResponse | null;
  setLogDraftsBySetId: Record<string, SetLogDraft>;
  setActiveSessionId(sessionId: string | null): void;
  setExerciseFeedback(exerciseEntryId: string, feedback: EffortFeedback): void;
  clearExerciseFeedback(): void;
  setSetLogDraft(setId: string, draft: SetLogDraft): void;
  clearSetLogDraft(setId: string): void;
  getMutationKey(scope: string, payload: unknown): string;
  clearMutationKey(scope: string): void;
  clearAllMutationKeys(): void;
  setLatestSummary(summary: CompleteWorkoutSessionResponse | null): void;
  resetForCompletedWorkout(): void;
  resetForDiscardedWorkout(): void;
};

export const useActiveWorkoutStore = create<ActiveWorkoutState>((set, get) => ({
  activeSessionId: null,
  exerciseFeedbackByEntryId: {},
  idempotencyKeys: {},
  latestSummary: null,
  setLogDraftsBySetId: {},
  setActiveSessionId(sessionId) {
    set({ activeSessionId: sessionId });
  },
  setExerciseFeedback(exerciseEntryId, feedback) {
    set((state) => ({
      exerciseFeedbackByEntryId: {
        ...state.exerciseFeedbackByEntryId,
        [exerciseEntryId]: feedback
      }
    }));
  },
  clearExerciseFeedback() {
    set({ exerciseFeedbackByEntryId: {} });
  },
  setSetLogDraft(setId, draft) {
    set((state) => ({
      setLogDraftsBySetId: {
        ...state.setLogDraftsBySetId,
        [setId]: draft
      }
    }));
  },
  clearSetLogDraft(setId) {
    set((state) => {
      const nextDrafts = { ...state.setLogDraftsBySetId };
      delete nextDrafts[setId];
      return {
        setLogDraftsBySetId: nextDrafts
      };
    });
  },
  getMutationKey(scope, payload) {
    const existing = get().idempotencyKeys[scope];
    const next = existing
      ? resolveStableIdempotencyKey({
          scope,
          payload,
          existing
        })
      : resolveStableIdempotencyKey({
          scope,
          payload
        });

    set((state) => ({
      idempotencyKeys: {
        ...state.idempotencyKeys,
        [scope]: next
      }
    }));

    return next.key;
  },
  clearMutationKey(scope) {
    set((state) => {
      const nextKeys = { ...state.idempotencyKeys };
      delete nextKeys[scope];
      return {
        idempotencyKeys: nextKeys
      };
    });
  },
  clearAllMutationKeys() {
    set({ idempotencyKeys: {} });
  },
  setLatestSummary(summary) {
    set({ latestSummary: summary });
  },
  resetForCompletedWorkout() {
    set({
      activeSessionId: null,
      exerciseFeedbackByEntryId: {},
      idempotencyKeys: {},
      setLogDraftsBySetId: {}
    });
  },
  resetForDiscardedWorkout() {
    set({
      activeSessionId: null,
      exerciseFeedbackByEntryId: {},
      idempotencyKeys: {},
      latestSummary: null,
      setLogDraftsBySetId: {}
    });
  }
}));
