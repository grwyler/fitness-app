import assert from "node:assert/strict";
import { ProgressionEngine } from "./progression-engine.js";
import type { DomainTestCase } from "../test-helpers/test-case.js";

const engine = new ProgressionEngine();

export const progressionEngineTestCases: DomainTestCase[] = [
  {
    name: "ProgressionEngine increases compound lifts by 5 lbs on just_right success",
    run: () => {
    const result = engine.calculate({
      state: {
        currentWeightLbs: 135,
        lastCompletedWeightLbs: 130,
        consecutiveFailures: 0,
        lastEffortFeedback: "just_right"
      },
      exercise: {
        exerciseName: "Bench Press",
        exerciseCategory: "compound",
        incrementLbs: 5
      },
      outcome: {
        effortFeedback: "just_right",
        hasFailure: false
      }
    });

    assert.equal(result.nextWeightLbs, 140);
    assert.equal(result.result, "increased");
    assert.equal(result.nextState.lastCompletedWeightLbs, 135);
    assert.equal(result.nextState.consecutiveFailures, 0);
    }
  },
  {
    name: "ProgressionEngine increases compound lifts by 10 lbs on too_easy success",
    run: () => {
      const result = engine.calculate({
        state: {
          currentWeightLbs: 185,
          lastCompletedWeightLbs: 180,
          consecutiveFailures: 0,
          lastEffortFeedback: "just_right"
        },
        exercise: {
          exerciseName: "Squat",
          exerciseCategory: "compound",
          incrementLbs: 5
        },
        outcome: {
          effortFeedback: "too_easy",
          hasFailure: false
        }
      });

      assert.equal(result.nextWeightLbs, 195);
      assert.equal(result.result, "increased");
    }
  },
  {
    name: "ProgressionEngine repeats weight on successful too_hard feedback",
    run: () => {
      const result = engine.calculate({
        state: {
          currentWeightLbs: 95,
          lastCompletedWeightLbs: 90,
          consecutiveFailures: 1,
          lastEffortFeedback: "too_easy"
        },
        exercise: {
          exerciseName: "Overhead Press",
          exerciseCategory: "compound",
          incrementLbs: 5
        },
        outcome: {
          effortFeedback: "too_hard",
          hasFailure: false
        }
      });

      assert.equal(result.nextWeightLbs, 95);
      assert.equal(result.result, "repeated");
      assert.equal(result.nextState.lastCompletedWeightLbs, 95);
      assert.equal(result.nextState.consecutiveFailures, 0);
    }
  },
  {
    name: "ProgressionEngine increases accessory lifts by 2.5 lbs on just_right success",
    run: () => {
      const result = engine.calculate({
        state: {
          currentWeightLbs: 25,
          lastCompletedWeightLbs: 22.5,
          consecutiveFailures: 0,
          lastEffortFeedback: "just_right"
        },
        exercise: {
          exerciseName: "Bicep Curl",
          exerciseCategory: "accessory",
          incrementLbs: 2.5
        },
        outcome: {
          effortFeedback: "just_right",
          hasFailure: false
        }
      });

      assert.equal(result.nextWeightLbs, 27.5);
      assert.equal(result.result, "increased");
    }
  },
  {
    name: "ProgressionEngine increases accessory lifts by 5 lbs on too_easy success",
    run: () => {
      const result = engine.calculate({
        state: {
          currentWeightLbs: 40,
          lastCompletedWeightLbs: 37.5,
          consecutiveFailures: 0,
          lastEffortFeedback: "just_right"
        },
        exercise: {
          exerciseName: "Lat Pulldown",
          exerciseCategory: "accessory",
          incrementLbs: 2.5
        },
        outcome: {
          effortFeedback: "too_easy",
          hasFailure: false
        }
      });

      assert.equal(result.nextWeightLbs, 45);
      assert.equal(result.result, "increased");
    }
  },
  {
    name: "ProgressionEngine repeats weight and increments consecutive failures after first failed workout",
    run: () => {
      const result = engine.calculate({
        state: {
          currentWeightLbs: 135,
          lastCompletedWeightLbs: 130,
          consecutiveFailures: 0,
          lastEffortFeedback: "just_right"
        },
        exercise: {
          exerciseName: "Bench Press",
          exerciseCategory: "compound",
          incrementLbs: 5
        },
        outcome: {
          effortFeedback: "too_hard",
          hasFailure: true
        }
      });

      assert.equal(result.nextWeightLbs, 135);
      assert.equal(result.result, "repeated");
      assert.equal(result.nextState.consecutiveFailures, 1);
      assert.equal(result.nextState.lastCompletedWeightLbs, 130);
    }
  },
  {
    name: "ProgressionEngine deloads by 10 percent and rounds down to the increment after the second consecutive failed workout",
    run: () => {
      const result = engine.calculate({
        state: {
          currentWeightLbs: 135,
          lastCompletedWeightLbs: 130,
          consecutiveFailures: 1,
          lastEffortFeedback: "too_hard"
        },
        exercise: {
          exerciseName: "Bench Press",
          exerciseCategory: "compound",
          incrementLbs: 5
        },
        outcome: {
          effortFeedback: "too_hard",
          hasFailure: true
        }
      });

      assert.equal(result.nextWeightLbs, 120);
      assert.equal(result.result, "reduced");
      assert.equal(result.nextState.consecutiveFailures, 0);
    }
  },
  {
    name: "ProgressionEngine forces a decrement when 10 percent deload rounds back to the same weight",
    run: () => {
      const result = engine.calculate({
        state: {
          currentWeightLbs: 2.5,
          lastCompletedWeightLbs: 2.5,
          consecutiveFailures: 1,
          lastEffortFeedback: "too_hard"
        },
        exercise: {
          exerciseName: "Cable Raise",
          exerciseCategory: "accessory",
          incrementLbs: 2.5
        },
        outcome: {
          effortFeedback: "too_hard",
          hasFailure: true
        }
      });

      assert.equal(result.nextWeightLbs, 0);
      assert.equal(result.result, "reduced");
    }
  },
  {
    name: "ProgressionEngine recalibrates when multiple sets materially outperform the prescribed weight",
    run: () => {
      const result = engine.calculate({
        state: {
          currentWeightLbs: 135,
          lastCompletedWeightLbs: 130,
          consecutiveFailures: 0,
          lastEffortFeedback: "just_right"
        },
        exercise: {
          exerciseName: "Bench Press",
          exerciseCategory: "compound",
          incrementLbs: 5
        },
        outcome: {
          effortFeedback: "just_right",
          hasFailure: true,
          sets: [
            { targetReps: 5, actualReps: 4, targetWeightLbs: 135, actualWeightLbs: 225 },
            { targetReps: 5, actualReps: 4, targetWeightLbs: 135, actualWeightLbs: 225 },
            { targetReps: 5, actualReps: 4, targetWeightLbs: 135, actualWeightLbs: 225 }
          ]
        }
      });

      assert.equal(result.result, "recalibrated");
      assert.equal(result.nextWeightLbs, 215);
      assert.equal(result.nextState.consecutiveFailures, 0);
      assert.equal(result.nextState.lastCompletedWeightLbs, 215);
      assert.match(result.reason, /Adjusted Bench Press working weight based on your performance/);
    }
  },
  {
    name: "ProgressionEngine does not recalibrate from one anomalous heavy set",
    run: () => {
      const result = engine.calculate({
        state: {
          currentWeightLbs: 135,
          lastCompletedWeightLbs: 130,
          consecutiveFailures: 0,
          lastEffortFeedback: "just_right"
        },
        exercise: {
          exerciseName: "Bench Press",
          exerciseCategory: "compound",
          incrementLbs: 5
        },
        outcome: {
          effortFeedback: "just_right",
          hasFailure: true,
          sets: [
            { targetReps: 5, actualReps: 4, targetWeightLbs: 135, actualWeightLbs: 225 },
            { targetReps: 5, actualReps: 5, targetWeightLbs: 135, actualWeightLbs: 135 },
            { targetReps: 5, actualReps: 5, targetWeightLbs: 135, actualWeightLbs: 135 }
          ]
        }
      });

      assert.equal(result.result, "increased");
      assert.equal(result.nextWeightLbs, 140);
      assert.equal(result.nextState.consecutiveFailures, 0);
    }
  },
  {
    name: "ProgressionEngine still repeats normal missed-rep workouts",
    run: () => {
      const result = engine.calculate({
        state: {
          currentWeightLbs: 135,
          lastCompletedWeightLbs: 130,
          consecutiveFailures: 0,
          lastEffortFeedback: "just_right"
        },
        exercise: {
          exerciseName: "Bench Press",
          exerciseCategory: "compound",
          incrementLbs: 5
        },
        outcome: {
          effortFeedback: "too_hard",
          hasFailure: true,
          sets: [
            { targetReps: 5, actualReps: 4, targetWeightLbs: 135, actualWeightLbs: 135 },
            { targetReps: 5, actualReps: 5, targetWeightLbs: 135, actualWeightLbs: 135 },
            { targetReps: 5, actualReps: 5, targetWeightLbs: 135, actualWeightLbs: 135 }
          ]
        }
      });

      assert.equal(result.result, "repeated");
      assert.equal(result.nextWeightLbs, 135);
      assert.equal(result.nextState.consecutiveFailures, 1);
    }
  }
];
