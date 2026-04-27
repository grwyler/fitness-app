import assert from "node:assert/strict";
import type { SetDto } from "@fitness/shared";
import {
  buildLogSetRequestFromDraft,
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
    }
  }
];
