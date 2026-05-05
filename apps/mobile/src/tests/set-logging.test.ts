import assert from "node:assert/strict";
import type { SetDto } from "@fitness/shared";
import {
  adjustWeightText,
  applySetEffortCategory,
  buildLogSetRequestFromDraft,
  formatSetEffortSummary,
  formatRestTimer,
  getSetEffortCategory,
  getRestTimerSecondsRemaining,
  getPreviousLoggedSet,
  getRestDurationSeconds,
  getSetLogDefaultDraft,
  getSetOutcomeText,
  getSetStatusLabel,
  normalizeRepsInput,
  normalizeWeightInput,
  validateSetLogDraft
} from "../features/workout/utils/set-logging.shared.js";
import type { MobileTestCase } from "./mobile-test-case.js";

function createSet(overrides: Partial<SetDto> = {}): SetDto {
  return {
    id: "set-1",
    exerciseEntryId: "entry-1",
    setNumber: 1,
    targetReps: 8,
    actualReps: null,
    targetWeight: {
      value: 135,
      unit: "lb"
    },
    actualWeight: null,
    status: "pending",
    rir: null,
    failureStatus: null,
    completedAt: null,
    ...overrides
  };
}

export const setLoggingTestCases: MobileTestCase[] = [
  {
    name: "Set logging defaults use the previous logged set when available",
    run: () => {
      const previousSet = createSet({
        id: "set-1",
        actualReps: 7,
        actualWeight: {
          value: 132.5,
          unit: "lb"
        },
        status: "failed"
      });
      const nextSet = createSet({
        id: "set-2",
        setNumber: 2,
        targetReps: 8,
        targetWeight: {
          value: 135,
          unit: "lb"
        }
      });

      assert.deepEqual(getSetLogDefaultDraft({ set: nextSet, previousSet }), {
        repsText: "7",
        weightText: "132.5"
      });
    }
  },
  {
    name: "Set logging finds previous logged values and adjusts weight safely",
    run: () => {
      const sets = [
        createSet({
          id: "set-1",
          setNumber: 1,
          actualReps: 8,
          actualWeight: {
            value: 135,
            unit: "lb"
          },
          status: "completed"
        }),
        createSet({
          id: "set-2",
          setNumber: 2,
          status: "pending"
        }),
        createSet({
          id: "set-3",
          setNumber: 3,
          status: "pending"
        })
      ];

      assert.equal(getPreviousLoggedSet({ sets, setNumber: 3 })?.id, "set-1");
      assert.equal(adjustWeightText({ weightText: "135", delta: 2.5 }), "137.5");
      assert.equal(adjustWeightText({ weightText: "2.5", delta: -5 }), "0");
    }
  },
  {
    name: "Set logging normalizes mobile numeric input",
    run: () => {
      assert.equal(normalizeRepsInput("0a09 reps"), "9");
      assert.equal(normalizeWeightInput("00135.509 lb"), "135.50");
      assert.equal(normalizeWeightInput("..5"), "0.5");
    }
  },
  {
    name: "Set logging builds valid requests and rejects invalid drafts",
    run: () => {
      const validRequest = buildLogSetRequestFromDraft({
        repsText: "8",
        weightText: "135"
      });

      assert.deepEqual(validRequest, {
        actualReps: 8,
        actualWeight: {
          value: 135,
          unit: "lb"
        }
      });
      assert.equal(validateSetLogDraft({ repsText: "", weightText: "135" }).error, "Enter reps as a whole number.");
      assert.equal(validateSetLogDraft({ repsText: "8", weightText: "" }).error, "Enter a valid load.");
      assert.equal(buildLogSetRequestFromDraft({ repsText: "", weightText: "135" }), null);
    }
  },
  {
    name: "Set logging labels distinguish pending, completed, and failed sets",
    run: () => {
      assert.equal(getSetStatusLabel(createSet()), "Not logged");
      assert.equal(getSetStatusLabel(createSet({ status: "completed" })), "Done");
      assert.equal(getSetStatusLabel(createSet({ status: "failed" })), "Missed reps");
      assert.equal(getSetOutcomeText({ actualReps: 8, targetReps: 8 }), "Meets target");
      assert.equal(getSetOutcomeText({ actualReps: 7, targetReps: 8 }), "Below target");
      assert.equal(
        getSetOutcomeText({
          actualReps: 4,
          targetReps: 5,
          actualWeightValue: 225,
          targetWeightValue: 135
        }),
        "Heavy work"
      );
    }
  },
  {
    name: "Rest timer helpers use exercise rest targets and fallback defaults",
    run: () => {
      assert.equal(getRestDurationSeconds({ restSeconds: 90, exerciseCategory: "compound" }), 90);
      assert.equal(getRestDurationSeconds({ restSeconds: null, exerciseCategory: "accessory" }), 75);
      assert.equal(getRestDurationSeconds({ restSeconds: null, exerciseCategory: "compound" }), 120);
      assert.equal(formatRestTimer(75), "1:15");
      assert.equal(formatRestTimer(0), "0:00");
      assert.equal(getRestTimerSecondsRemaining({ endAtMs: 10_000, nowMs: 9_000 }), 1);
      assert.equal(getRestTimerSecondsRemaining({ endAtMs: 10_000, nowMs: 10_000 }), 0);
      assert.equal(getRestTimerSecondsRemaining({ endAtMs: 10_000, nowMs: 11_000 }), 0);
    }
  },
  {
    name: "Set effort categories map to consistent rir/failure fields",
    run: () => {
      const baseDraft = { repsText: "8", weightText: "135" as string };

      assert.equal(getSetEffortCategory({ rir: "rir_5_plus", failureStatus: null }), "very_easy");
      assert.equal(getSetEffortCategory({ rir: "rir_2", failureStatus: null }), "good");
      assert.equal(getSetEffortCategory({ rir: "rir_1", failureStatus: null }), "hard");
      assert.equal(getSetEffortCategory({ rir: "rir_0", failureStatus: null }), "max");
      assert.equal(getSetEffortCategory({ rir: null, failureStatus: "technical_failure" }), "max");
      assert.equal(getSetEffortCategory({ rir: null, failureStatus: "stopped_early" }), "stopped_early");

      assert.deepEqual(applySetEffortCategory(baseDraft, "very_easy"), {
        ...baseDraft,
        rir: "rir_5_plus",
        failureStatus: null
      });
      assert.deepEqual(applySetEffortCategory(baseDraft, "good"), {
        ...baseDraft,
        rir: "rir_2",
        failureStatus: null
      });
      assert.deepEqual(applySetEffortCategory(baseDraft, "hard"), {
        ...baseDraft,
        rir: "rir_1",
        failureStatus: null
      });
      assert.deepEqual(applySetEffortCategory(baseDraft, "max"), {
        ...baseDraft,
        rir: "rir_0"
      });
      assert.deepEqual(applySetEffortCategory(baseDraft, "stopped_early"), {
        ...baseDraft,
        rir: null,
        failureStatus: "stopped_early"
      });

      assert.deepEqual(buildLogSetRequestFromDraft(applySetEffortCategory(baseDraft, "stopped_early")), {
        actualReps: 8,
        actualWeight: { value: 135, unit: "lb" },
        rir: null,
        failureStatus: "stopped_early"
      });
    }
  },
  {
    name: "Set effort summaries are user-friendly and non-jargony",
    run: () => {
      assert.equal(formatSetEffortSummary({ rir: "rir_5_plus", failureStatus: null }), "Very easy (4+ left)");
      assert.equal(formatSetEffortSummary({ rir: "rir_2", failureStatus: null }), "Good (2 left)");
      assert.equal(formatSetEffortSummary({ rir: "rir_1", failureStatus: null }), "Hard (1 left)");
      assert.equal(formatSetEffortSummary({ rir: "rir_0", failureStatus: null }), "Max");
      assert.equal(formatSetEffortSummary({ rir: null, failureStatus: "muscular_failure" }), "Max (failure)");
      assert.equal(formatSetEffortSummary({ rir: null, failureStatus: "technical_failure" }), "Max (technique)");
      assert.equal(formatSetEffortSummary({ rir: null, failureStatus: "stopped_early" }), "Stopped early");
    }
  }
];
