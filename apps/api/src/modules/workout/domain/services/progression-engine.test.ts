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
        incrementLbs: 5,
        isBodyweight: false,
        isWeightOptional: false
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
    name: "ProgressionEngine repeats after 14+ days off even if the workout was successful",
    run: () => {
      const performedAt = new Date("2026-05-01T10:00:00.000Z");
      const lastPerformedAt = new Date("2026-04-17T10:00:00.000Z");

      const result = engine.calculate({
        performedAt,
        state: {
          currentWeightLbs: 135,
          lastCompletedWeightLbs: 130,
          consecutiveFailures: 0,
          lastEffortFeedback: "just_right",
          lastPerformedAt
        },
        exercise: {
          exerciseName: "Bench Press",
          exerciseCategory: "compound",
          incrementLbs: 5,
          isBodyweight: false,
          isWeightOptional: false
        },
        outcome: {
          effortFeedback: "just_right",
          hasFailure: false
        }
      });

      assert.equal(result.result, "repeated");
      assert.equal(result.nextWeightLbs, 135);
      assert.match(result.reason, /not been trained recently/i);
    }
  },
  {
    name: "ProgressionEngine reduces after 30+ days off even if the workout was successful",
    run: () => {
      const performedAt = new Date("2026-05-01T10:00:00.000Z");
      const lastPerformedAt = new Date("2026-04-01T10:00:00.000Z");

      const result = engine.calculate({
        performedAt,
        state: {
          currentWeightLbs: 135,
          lastCompletedWeightLbs: 130,
          consecutiveFailures: 0,
          lastEffortFeedback: "just_right",
          lastPerformedAt
        },
        exercise: {
          exerciseName: "Bench Press",
          exerciseCategory: "compound",
          incrementLbs: 5,
          isBodyweight: false,
          isWeightOptional: false
        },
        outcome: {
          effortFeedback: "just_right",
          hasFailure: false
        }
      });

      assert.equal(result.result, "reduced");
      assert.equal(result.nextWeightLbs, 130);
      assert.match(result.reason, /over 30 days/i);
    }
  },
  {
    name: "ProgressionEngine preserves normal progression when lastPerformedAt is missing",
    run: () => {
      const performedAt = new Date("2026-05-01T10:00:00.000Z");

      const result = engine.calculate({
        performedAt,
        state: {
          currentWeightLbs: 135,
          lastCompletedWeightLbs: 130,
          consecutiveFailures: 0,
          lastEffortFeedback: "just_right",
          lastPerformedAt: null
        },
        exercise: {
          exerciseName: "Bench Press",
          exerciseCategory: "compound",
          incrementLbs: 5,
          isBodyweight: false,
          isWeightOptional: false
        },
        outcome: {
          effortFeedback: "just_right",
          hasFailure: false
        }
      });

      assert.equal(result.result, "increased");
      assert.equal(result.nextWeightLbs, 140);
    }
  },
  {
    name: "ProgressionEngine keeps failure logic even after a long training gap",
    run: () => {
      const performedAt = new Date("2026-05-01T10:00:00.000Z");
      const lastPerformedAt = new Date("2026-03-01T10:00:00.000Z");

      const result = engine.calculate({
        performedAt,
        state: {
          currentWeightLbs: 135,
          lastCompletedWeightLbs: 130,
          consecutiveFailures: 0,
          lastEffortFeedback: "just_right",
          lastPerformedAt
        },
        exercise: {
          exerciseName: "Bench Press",
          exerciseCategory: "compound",
          incrementLbs: 5,
          isBodyweight: false,
          isWeightOptional: false
        },
        outcome: {
          effortFeedback: "just_right",
          hasFailure: true
        }
      });

      assert.equal(result.result, "repeated");
      assert.equal(result.nextWeightLbs, 135);
      assert.equal(result.nextState.consecutiveFailures, 1);
      assert.doesNotMatch(result.reason, /not been trained/i);
    }
  },
  {
    name: "ProgressionEngine respects 10 lb per-exercise increments on success",
    run: () => {
      const result = engine.calculate({
        state: {
          currentWeightLbs: 120,
          lastCompletedWeightLbs: 110,
          consecutiveFailures: 0,
          lastEffortFeedback: "just_right"
        },
        exercise: {
          exerciseName: "Leg Press",
          exerciseCategory: "compound",
          incrementLbs: 10,
          isBodyweight: false,
          isWeightOptional: false
        },
        outcome: {
          effortFeedback: "just_right",
          hasFailure: false
        }
      });

      assert.equal(result.nextWeightLbs, 130);
      assert.equal(result.result, "increased");
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
          incrementLbs: 5,
          isBodyweight: false,
          isWeightOptional: false
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
    name: "ProgressionEngine uses more conservative too_easy jumps for advanced users",
    run: () => {
      const result = engine.calculate({
        experienceLevel: "advanced",
        state: {
          currentWeightLbs: 185,
          lastCompletedWeightLbs: 180,
          consecutiveFailures: 0,
          lastEffortFeedback: "just_right"
        },
        exercise: {
          exerciseName: "Squat",
          exerciseCategory: "compound",
          incrementLbs: 5,
          isBodyweight: false,
          isWeightOptional: false
        },
        outcome: {
          effortFeedback: "too_easy",
          hasFailure: false
        }
      });

      assert.equal(result.nextWeightLbs, 190);
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
          incrementLbs: 5,
          isBodyweight: false,
          isWeightOptional: false
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
          incrementLbs: 2.5,
          isBodyweight: false,
          isWeightOptional: false
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
          incrementLbs: 2.5,
          isBodyweight: false,
          isWeightOptional: false
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
          incrementLbs: 5,
          isBodyweight: false,
          isWeightOptional: false
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
          incrementLbs: 5,
          isBodyweight: false,
          isWeightOptional: false
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
          incrementLbs: 2.5,
          isBodyweight: false,
          isWeightOptional: false
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
          incrementLbs: 5,
          isBodyweight: false,
          isWeightOptional: false
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
      assert.match(result.reason, /Recalibrated from 135 lb to 215 lb/);
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
          incrementLbs: 5,
          isBodyweight: false,
          isWeightOptional: false
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
          incrementLbs: 5,
          isBodyweight: false,
          isWeightOptional: false
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
  ,
  {
    name: "ProgressionEngine skips weight progression for pure bodyweight exercises",
    run: () => {
      const result = engine.calculate({
        state: {
          currentWeightLbs: 0,
          lastCompletedWeightLbs: null,
          consecutiveFailures: 0,
          lastEffortFeedback: null
        },
        exercise: {
          exerciseName: "Push-Ups",
          exerciseCategory: "compound",
          incrementLbs: 2.5,
          isBodyweight: true,
          isWeightOptional: false
        },
        outcome: {
          effortFeedback: "just_right",
          hasFailure: false
        }
      });

      assert.equal(result.result, "skipped");
      assert.equal(result.nextWeightLbs, 0);
      assert.match(result.reason, /bodyweight movement/);
    }
  },
  {
    name: "ProgressionEngine skips weight progression for weight-optional exercises at 0 lb",
    run: () => {
      const result = engine.calculate({
        state: {
          currentWeightLbs: 0,
          lastCompletedWeightLbs: null,
          consecutiveFailures: 0,
          lastEffortFeedback: null
        },
        exercise: {
          exerciseName: "Pull-Ups",
          exerciseCategory: "compound",
          incrementLbs: 2.5,
          isBodyweight: true,
          isWeightOptional: true
        },
        outcome: {
          effortFeedback: "just_right",
          hasFailure: false
        }
      });

      assert.equal(result.result, "skipped");
      assert.equal(result.nextWeightLbs, 0);
      assert.match(result.reason, /weight-optional/);
    }
  },
  {
    name: "ProgressionEngine allows explicitly weighted bodyweight variations to progress",
    run: () => {
      const result = engine.calculate({
        state: {
          currentWeightLbs: 10,
          lastCompletedWeightLbs: 7.5,
          consecutiveFailures: 0,
          lastEffortFeedback: "just_right"
        },
        exercise: {
          exerciseName: "Weighted Pull-Ups",
          exerciseCategory: "compound",
          incrementLbs: 2.5,
          isBodyweight: true,
          isWeightOptional: true
        },
        outcome: {
          effortFeedback: "just_right",
          hasFailure: false
        }
      });

      assert.equal(result.result, "increased");
      assert.equal(result.nextWeightLbs, 12.5);
    }
  }
  ,
  {
    name: "ProgressionEngine (double) increases rep goal within the rep range before increasing weight",
    run: () => {
      const result = engine.calculateDoubleProgression({
        performedAt: new Date("2026-05-01T10:00:00.000Z"),
        state: {
          currentWeightLbs: 135,
          lastCompletedWeightLbs: 130,
          consecutiveFailures: 0,
          lastEffortFeedback: "just_right",
          lastPerformedAt: new Date("2026-04-28T10:00:00.000Z"),
          repGoal: 8,
          repRangeMin: 6,
          repRangeMax: 10
        },
        exercise: {
          exerciseName: "Bench Press",
          exerciseCategory: "compound",
          incrementLbs: 5,
          isBodyweight: false,
          isWeightOptional: false
        },
        outcome: {
          effortFeedback: "just_right",
          sets: [
            { targetReps: 8, actualReps: 8, targetWeightLbs: 135, actualWeightLbs: 135 },
            { targetReps: 8, actualReps: 8, targetWeightLbs: 135, actualWeightLbs: 135 },
            { targetReps: 8, actualReps: 9, targetWeightLbs: 135, actualWeightLbs: 135 }
          ]
        }
      });

      assert.equal(result.previousWeightLbs, 135);
      assert.equal(result.nextWeightLbs, 135);
      assert.equal(result.previousRepGoal, 8);
      assert.equal(result.nextRepGoal, 9);
      assert.equal(result.nextState.consecutiveFailures, 0);
      assert.equal(result.nextState.repGoal, 9);
      assert.match(result.reason, /Increased reps from 8 to 9/);
    }
  },
  {
    name: "ProgressionEngine (double) repeats after 14+ days off even if rep goal was met",
    run: () => {
      const performedAt = new Date("2026-05-01T10:00:00.000Z");
      const lastPerformedAt = new Date("2026-04-17T10:00:00.000Z");

      const result = engine.calculateDoubleProgression({
        performedAt,
        state: {
          currentWeightLbs: 135,
          lastCompletedWeightLbs: 130,
          consecutiveFailures: 0,
          lastEffortFeedback: "just_right",
          lastPerformedAt,
          repGoal: 8,
          repRangeMin: 6,
          repRangeMax: 10
        },
        exercise: {
          exerciseName: "Bench Press",
          exerciseCategory: "compound",
          incrementLbs: 5,
          isBodyweight: false,
          isWeightOptional: false
        },
        outcome: {
          effortFeedback: "just_right",
          sets: [
            { targetReps: 8, actualReps: 8, targetWeightLbs: 135, actualWeightLbs: 135 },
            { targetReps: 8, actualReps: 8, targetWeightLbs: 135, actualWeightLbs: 135 },
            { targetReps: 8, actualReps: 9, targetWeightLbs: 135, actualWeightLbs: 135 }
          ]
        }
      });

      assert.equal(result.result, "repeated");
      assert.equal(result.nextWeightLbs, 135);
      assert.equal(result.nextRepGoal, 8);
      assert.match(result.reason, /not been trained recently/i);
    }
  },
  {
    name: "ProgressionEngine (double) reduces after 30+ days off even if rep goal was met",
    run: () => {
      const performedAt = new Date("2026-05-01T10:00:00.000Z");
      const lastPerformedAt = new Date("2026-04-01T10:00:00.000Z");

      const result = engine.calculateDoubleProgression({
        performedAt,
        state: {
          currentWeightLbs: 135,
          lastCompletedWeightLbs: 130,
          consecutiveFailures: 0,
          lastEffortFeedback: "just_right",
          lastPerformedAt,
          repGoal: 8,
          repRangeMin: 6,
          repRangeMax: 10
        },
        exercise: {
          exerciseName: "Bench Press",
          exerciseCategory: "compound",
          incrementLbs: 5,
          isBodyweight: false,
          isWeightOptional: false
        },
        outcome: {
          effortFeedback: "just_right",
          sets: [
            { targetReps: 8, actualReps: 8, targetWeightLbs: 135, actualWeightLbs: 135 },
            { targetReps: 8, actualReps: 8, targetWeightLbs: 135, actualWeightLbs: 135 },
            { targetReps: 8, actualReps: 9, targetWeightLbs: 135, actualWeightLbs: 135 }
          ]
        }
      });

      assert.equal(result.result, "reduced");
      assert.equal(result.nextWeightLbs, 130);
      assert.equal(result.nextRepGoal, 6);
      assert.match(result.reason, /over 30 days/i);
    }
  },
  {
    name: "ProgressionEngine (double) preserves normal progression when lastPerformedAt is missing",
    run: () => {
      const performedAt = new Date("2026-05-01T10:00:00.000Z");

      const result = engine.calculateDoubleProgression({
        performedAt,
        state: {
          currentWeightLbs: 135,
          lastCompletedWeightLbs: 130,
          consecutiveFailures: 0,
          lastEffortFeedback: "just_right",
          lastPerformedAt: null,
          repGoal: 8,
          repRangeMin: 6,
          repRangeMax: 10
        },
        exercise: {
          exerciseName: "Bench Press",
          exerciseCategory: "compound",
          incrementLbs: 5,
          isBodyweight: false,
          isWeightOptional: false
        },
        outcome: {
          effortFeedback: "just_right",
          sets: [
            { targetReps: 8, actualReps: 8, targetWeightLbs: 135, actualWeightLbs: 135 },
            { targetReps: 8, actualReps: 8, targetWeightLbs: 135, actualWeightLbs: 135 },
            { targetReps: 8, actualReps: 9, targetWeightLbs: 135, actualWeightLbs: 135 }
          ]
        }
      });

      assert.equal(result.result, "increased");
      assert.equal(result.nextWeightLbs, 135);
      assert.equal(result.nextRepGoal, 9);
    }
  },
  {
    name: "ProgressionEngine (double) keeps failure logic even after a long training gap",
    run: () => {
      const performedAt = new Date("2026-05-01T10:00:00.000Z");
      const lastPerformedAt = new Date("2026-03-01T10:00:00.000Z");

      const result = engine.calculateDoubleProgression({
        performedAt,
        state: {
          currentWeightLbs: 135,
          lastCompletedWeightLbs: 130,
          consecutiveFailures: 0,
          lastEffortFeedback: "just_right",
          lastPerformedAt,
          repGoal: 8,
          repRangeMin: 6,
          repRangeMax: 10
        },
        exercise: {
          exerciseName: "Bench Press",
          exerciseCategory: "compound",
          incrementLbs: 5,
          isBodyweight: false,
          isWeightOptional: false
        },
        outcome: {
          effortFeedback: "just_right",
          sets: [
            { targetReps: 8, actualReps: 5, targetWeightLbs: 135, actualWeightLbs: 135 },
            { targetReps: 8, actualReps: 6, targetWeightLbs: 135, actualWeightLbs: 135 },
            { targetReps: 8, actualReps: 6, targetWeightLbs: 135, actualWeightLbs: 135 }
          ]
        }
      });

      assert.equal(result.result, "repeated");
      assert.equal(result.nextState.consecutiveFailures, 1);
      assert.doesNotMatch(result.reason, /not been trained/i);
    }
  },
  {
    name: "ProgressionEngine (double) increases reps faster on too_easy within a rep range",
    run: () => {
      const result = engine.calculateDoubleProgression({
        performedAt: new Date("2026-05-01T10:00:00.000Z"),
        state: {
          currentWeightLbs: 135,
          lastCompletedWeightLbs: 130,
          consecutiveFailures: 0,
          lastEffortFeedback: "just_right",
          lastPerformedAt: new Date("2026-04-28T10:00:00.000Z"),
          repGoal: 8,
          repRangeMin: 6,
          repRangeMax: 10
        },
        exercise: {
          exerciseName: "Bench Press",
          exerciseCategory: "compound",
          incrementLbs: 5,
          isBodyweight: false,
          isWeightOptional: false
        },
        outcome: {
          effortFeedback: "too_easy",
          sets: [
            { targetReps: 8, actualReps: 8, targetWeightLbs: 135, actualWeightLbs: 135 },
            { targetReps: 8, actualReps: 9, targetWeightLbs: 135, actualWeightLbs: 135 },
            { targetReps: 8, actualReps: 10, targetWeightLbs: 135, actualWeightLbs: 135 }
          ]
        }
      });

      assert.equal(result.result, "increased");
      assert.equal(result.nextWeightLbs, 135);
      assert.equal(result.nextRepGoal, 10);
      assert.equal(result.nextState.repGoal, 10);
    }
  },
  {
    name: "ProgressionEngine (double) increases weight at the top of the rep range and resets reps",
    run: () => {
      const result = engine.calculateDoubleProgression({
        performedAt: new Date("2026-05-01T10:00:00.000Z"),
        state: {
          currentWeightLbs: 135,
          lastCompletedWeightLbs: 130,
          consecutiveFailures: 0,
          lastEffortFeedback: "just_right",
          lastPerformedAt: new Date("2026-04-28T10:00:00.000Z"),
          repGoal: 10,
          repRangeMin: 6,
          repRangeMax: 10
        },
        exercise: {
          exerciseName: "Bench Press",
          exerciseCategory: "compound",
          incrementLbs: 5,
          isBodyweight: false,
          isWeightOptional: false
        },
        outcome: {
          effortFeedback: "just_right",
          sets: [
            { targetReps: 10, actualReps: 10, targetWeightLbs: 135, actualWeightLbs: 135 },
            { targetReps: 10, actualReps: 10, targetWeightLbs: 135, actualWeightLbs: 135 },
            { targetReps: 10, actualReps: 11, targetWeightLbs: 135, actualWeightLbs: 135 }
          ]
        }
      });

      assert.equal(result.nextWeightLbs, 140);
      assert.equal(result.previousRepGoal, 10);
      assert.equal(result.nextRepGoal, 6);
      assert.equal(result.nextState.repGoal, 6);
      assert.equal(result.nextState.consecutiveFailures, 0);
      assert.match(result.reason, /Increased weight from 135 to 140/);
    }
  },
  {
    name: "ProgressionEngine (double) increases weight faster on too_easy at the top of a rep range",
    run: () => {
      const result = engine.calculateDoubleProgression({
        performedAt: new Date("2026-05-01T10:00:00.000Z"),
        state: {
          currentWeightLbs: 135,
          lastCompletedWeightLbs: 130,
          consecutiveFailures: 0,
          lastEffortFeedback: "just_right",
          lastPerformedAt: new Date("2026-04-28T10:00:00.000Z"),
          repGoal: 10,
          repRangeMin: 6,
          repRangeMax: 10
        },
        exercise: {
          exerciseName: "Bench Press",
          exerciseCategory: "compound",
          incrementLbs: 5,
          isBodyweight: false,
          isWeightOptional: false
        },
        outcome: {
          effortFeedback: "too_easy",
          sets: [
            { targetReps: 10, actualReps: 10, targetWeightLbs: 135, actualWeightLbs: 135 },
            { targetReps: 10, actualReps: 10, targetWeightLbs: 135, actualWeightLbs: 135 },
            { targetReps: 10, actualReps: 11, targetWeightLbs: 135, actualWeightLbs: 135 }
          ]
        }
      });

      assert.equal(result.result, "increased");
      assert.equal(result.nextWeightLbs, 145);
      assert.equal(result.nextRepGoal, 6);
      assert.equal(result.nextState.repGoal, 6);
    }
  },
  {
    name: "ProgressionEngine (double) favors earlier load jumps for strength goals",
    run: () => {
      const result = engine.calculateDoubleProgression({
        trainingGoal: "strength",
        performedAt: new Date("2026-05-01T10:00:00.000Z"),
        state: {
          currentWeightLbs: 135,
          lastCompletedWeightLbs: 130,
          consecutiveFailures: 0,
          lastEffortFeedback: "just_right",
          lastPerformedAt: new Date("2026-04-28T10:00:00.000Z"),
          repGoal: 6,
          repRangeMin: 5,
          repRangeMax: 8
        },
        exercise: {
          exerciseName: "Bench Press",
          exerciseCategory: "compound",
          incrementLbs: 5,
          isBodyweight: false,
          isWeightOptional: false
        },
        outcome: {
          effortFeedback: "just_right",
          sets: [
            { targetReps: 6, actualReps: 6, targetWeightLbs: 135, actualWeightLbs: 135 },
            { targetReps: 6, actualReps: 6, targetWeightLbs: 135, actualWeightLbs: 135 },
            { targetReps: 6, actualReps: 6, targetWeightLbs: 135, actualWeightLbs: 135 }
          ]
        }
      });

      assert.equal(result.result, "increased");
      assert.equal(result.nextWeightLbs, 140);
      assert.equal(result.nextRepGoal, 5);
    }
  },
  {
    name: "ProgressionEngine (double) keeps hypertrophy load increases controlled at the top of a rep range",
    run: () => {
      const result = engine.calculateDoubleProgression({
        trainingGoal: "hypertrophy",
        performedAt: new Date("2026-05-01T10:00:00.000Z"),
        state: {
          currentWeightLbs: 135,
          lastCompletedWeightLbs: 130,
          consecutiveFailures: 0,
          lastEffortFeedback: "just_right",
          lastPerformedAt: new Date("2026-04-28T10:00:00.000Z"),
          repGoal: 10,
          repRangeMin: 6,
          repRangeMax: 10
        },
        exercise: {
          exerciseName: "Bench Press",
          exerciseCategory: "compound",
          incrementLbs: 5,
          isBodyweight: false,
          isWeightOptional: false
        },
        outcome: {
          effortFeedback: "too_easy",
          sets: [
            { targetReps: 10, actualReps: 10, targetWeightLbs: 135, actualWeightLbs: 135 },
            { targetReps: 10, actualReps: 10, targetWeightLbs: 135, actualWeightLbs: 135 },
            { targetReps: 10, actualReps: 11, targetWeightLbs: 135, actualWeightLbs: 135 }
          ]
        }
      });

      assert.equal(result.result, "increased");
      assert.equal(result.nextWeightLbs, 140);
      assert.equal(result.nextRepGoal, 6);
    }
  },
  {
    name: "ProgressionEngine (double) repeats at the top of the rep range for endurance goals unless too_easy",
    run: () => {
      const result = engine.calculateDoubleProgression({
        trainingGoal: "endurance",
        performedAt: new Date("2026-05-01T10:00:00.000Z"),
        state: {
          currentWeightLbs: 135,
          lastCompletedWeightLbs: 130,
          consecutiveFailures: 0,
          lastEffortFeedback: "just_right",
          lastPerformedAt: new Date("2026-04-28T10:00:00.000Z"),
          repGoal: 10,
          repRangeMin: 6,
          repRangeMax: 10
        },
        exercise: {
          exerciseName: "Bench Press",
          exerciseCategory: "compound",
          incrementLbs: 5,
          isBodyweight: false,
          isWeightOptional: false
        },
        outcome: {
          effortFeedback: "just_right",
          sets: [
            { targetReps: 10, actualReps: 10, targetWeightLbs: 135, actualWeightLbs: 135 },
            { targetReps: 10, actualReps: 10, targetWeightLbs: 135, actualWeightLbs: 135 },
            { targetReps: 10, actualReps: 11, targetWeightLbs: 135, actualWeightLbs: 135 }
          ]
        }
      });

      assert.equal(result.result, "repeated");
      assert.equal(result.nextWeightLbs, 135);
      assert.equal(result.nextRepGoal, 10);
    }
  },
  {
    name: "ProgressionEngine (double) maintenance favors repeats unless too_easy",
    run: () => {
      const result = engine.calculateDoubleProgression({
        trainingGoal: "maintenance",
        performedAt: new Date("2026-05-01T10:00:00.000Z"),
        state: {
          currentWeightLbs: 135,
          lastCompletedWeightLbs: 130,
          consecutiveFailures: 0,
          lastEffortFeedback: "just_right",
          lastPerformedAt: new Date("2026-04-28T10:00:00.000Z"),
          repGoal: 8,
          repRangeMin: 6,
          repRangeMax: 10
        },
        exercise: {
          exerciseName: "Bench Press",
          exerciseCategory: "compound",
          incrementLbs: 5,
          isBodyweight: false,
          isWeightOptional: false
        },
        outcome: {
          effortFeedback: "just_right",
          sets: [
            { targetReps: 8, actualReps: 8, targetWeightLbs: 135, actualWeightLbs: 135 },
            { targetReps: 8, actualReps: 8, targetWeightLbs: 135, actualWeightLbs: 135 },
            { targetReps: 8, actualReps: 8, targetWeightLbs: 135, actualWeightLbs: 135 }
          ]
        }
      });

      assert.equal(result.result, "repeated");
      assert.equal(result.nextWeightLbs, 135);
      assert.equal(result.nextRepGoal, 8);
    }
  },
  {
    name: "ProgressionEngine (double) does not accelerate too_easy for fixed-rep exercises",
    run: () => {
      const result = engine.calculateDoubleProgression({
        performedAt: new Date("2026-05-01T10:00:00.000Z"),
        state: {
          currentWeightLbs: 135,
          lastCompletedWeightLbs: 130,
          consecutiveFailures: 0,
          lastEffortFeedback: "just_right",
          lastPerformedAt: new Date("2026-04-28T10:00:00.000Z"),
          repGoal: 8,
          repRangeMin: 8,
          repRangeMax: 8
        },
        exercise: {
          exerciseName: "Bench Press",
          exerciseCategory: "compound",
          incrementLbs: 5,
          isBodyweight: false,
          isWeightOptional: false
        },
        outcome: {
          effortFeedback: "too_easy",
          sets: [
            { targetReps: 8, actualReps: 8, targetWeightLbs: 135, actualWeightLbs: 135 },
            { targetReps: 8, actualReps: 8, targetWeightLbs: 135, actualWeightLbs: 135 },
            { targetReps: 8, actualReps: 9, targetWeightLbs: 135, actualWeightLbs: 135 }
          ]
        }
      });

      assert.equal(result.result, "increased");
      assert.equal(result.nextWeightLbs, 140);
      assert.equal(result.nextRepGoal, 8);
    }
  },
  {
    name: "ProgressionEngine (double) repeats and increments consecutive failures when below rep range minimum",
    run: () => {
      const result = engine.calculateDoubleProgression({
        performedAt: new Date("2026-05-01T10:00:00.000Z"),
        state: {
          currentWeightLbs: 135,
          lastCompletedWeightLbs: 130,
          consecutiveFailures: 0,
          lastEffortFeedback: "just_right",
          lastPerformedAt: new Date("2026-04-28T10:00:00.000Z"),
          repGoal: 8,
          repRangeMin: 6,
          repRangeMax: 10
        },
        exercise: {
          exerciseName: "Bench Press",
          exerciseCategory: "compound",
          incrementLbs: 5,
          isBodyweight: false,
          isWeightOptional: false
        },
        outcome: {
          effortFeedback: "just_right",
          sets: [
            { targetReps: 8, actualReps: 5, targetWeightLbs: 135, actualWeightLbs: 135 },
            { targetReps: 8, actualReps: 6, targetWeightLbs: 135, actualWeightLbs: 135 },
            { targetReps: 8, actualReps: 6, targetWeightLbs: 135, actualWeightLbs: 135 }
          ]
        }
      });

      assert.equal(result.result, "repeated");
      assert.equal(result.nextWeightLbs, 135);
      assert.equal(result.nextRepGoal, 8);
      assert.equal(result.nextState.consecutiveFailures, 1);
      assert.match(result.reason, /below the target range minimum/);
    }
  },
  {
    name: "ProgressionEngine (double) reduces weight after two consecutive below-range failures and resets reps",
    run: () => {
      const result = engine.calculateDoubleProgression({
        performedAt: new Date("2026-05-01T10:00:00.000Z"),
        state: {
          currentWeightLbs: 135,
          lastCompletedWeightLbs: 130,
          consecutiveFailures: 1,
          lastEffortFeedback: "just_right",
          lastPerformedAt: new Date("2026-04-28T10:00:00.000Z"),
          repGoal: 8,
          repRangeMin: 6,
          repRangeMax: 10
        },
        exercise: {
          exerciseName: "Bench Press",
          exerciseCategory: "compound",
          incrementLbs: 5,
          isBodyweight: false,
          isWeightOptional: false
        },
        outcome: {
          effortFeedback: "just_right",
          sets: [
            { targetReps: 8, actualReps: 4, targetWeightLbs: 135, actualWeightLbs: 135 },
            { targetReps: 8, actualReps: 5, targetWeightLbs: 135, actualWeightLbs: 135 },
            { targetReps: 8, actualReps: 6, targetWeightLbs: 135, actualWeightLbs: 135 }
          ]
        }
      });

      assert.equal(result.result, "reduced");
      assert.equal(result.nextWeightLbs, 130);
      assert.equal(result.nextRepGoal, 6);
      assert.equal(result.nextState.repGoal, 6);
      assert.equal(result.nextState.consecutiveFailures, 0);
      assert.match(result.reason, /Reduced weight after consecutive failures/);
    }
  },
  {
    name: "ProgressionEngine (double) resets consecutive failures when completing sets within range but below rep goal",
    run: () => {
      const first = engine.calculateDoubleProgression({
        performedAt: new Date("2026-05-01T10:00:00.000Z"),
        state: {
          currentWeightLbs: 135,
          lastCompletedWeightLbs: 130,
          consecutiveFailures: 1,
          lastEffortFeedback: "just_right",
          lastPerformedAt: new Date("2026-04-28T10:00:00.000Z"),
          repGoal: 8,
          repRangeMin: 6,
          repRangeMax: 10
        },
        exercise: {
          exerciseName: "Bench Press",
          exerciseCategory: "compound",
          incrementLbs: 5,
          isBodyweight: false,
          isWeightOptional: false
        },
        outcome: {
          effortFeedback: "just_right",
          sets: [
            { targetReps: 8, actualReps: 7, targetWeightLbs: 135, actualWeightLbs: 135 },
            { targetReps: 8, actualReps: 8, targetWeightLbs: 135, actualWeightLbs: 135 },
            { targetReps: 8, actualReps: 8, targetWeightLbs: 135, actualWeightLbs: 135 }
          ]
        }
      });

      assert.equal(first.result, "repeated");
      assert.equal(first.nextWeightLbs, 135);
      assert.equal(first.nextState.consecutiveFailures, 0);

      const second = engine.calculateDoubleProgression({
        performedAt: new Date("2026-05-01T10:00:00.000Z"),
        state: first.nextState,
        exercise: {
          exerciseName: "Bench Press",
          exerciseCategory: "compound",
          incrementLbs: 5,
          isBodyweight: false,
          isWeightOptional: false
        },
        outcome: {
          effortFeedback: "just_right",
          sets: [
            { targetReps: 8, actualReps: 5, targetWeightLbs: 135, actualWeightLbs: 135 },
            { targetReps: 8, actualReps: 6, targetWeightLbs: 135, actualWeightLbs: 135 },
            { targetReps: 8, actualReps: 6, targetWeightLbs: 135, actualWeightLbs: 135 }
          ]
        }
      });

      assert.equal(second.result, "repeated");
      assert.equal(second.nextWeightLbs, 135);
      assert.equal(second.nextState.consecutiveFailures, 1);
    }
  },
  {
    name: "ProgressionEngine (double) repeats without progression when effort is marked too_hard",
    run: () => {
      const result = engine.calculateDoubleProgression({
        performedAt: new Date("2026-05-01T10:00:00.000Z"),
        state: {
          currentWeightLbs: 135,
          lastCompletedWeightLbs: 130,
          consecutiveFailures: 0,
          lastEffortFeedback: "just_right",
          lastPerformedAt: new Date("2026-04-28T10:00:00.000Z"),
          repGoal: 8,
          repRangeMin: 6,
          repRangeMax: 10
        },
        exercise: {
          exerciseName: "Bench Press",
          exerciseCategory: "compound",
          incrementLbs: 5,
          isBodyweight: false,
          isWeightOptional: false
        },
        outcome: {
          effortFeedback: "too_hard",
          sets: [
            { targetReps: 8, actualReps: 8, targetWeightLbs: 135, actualWeightLbs: 135 },
            { targetReps: 8, actualReps: 8, targetWeightLbs: 135, actualWeightLbs: 135 },
            { targetReps: 8, actualReps: 8, targetWeightLbs: 135, actualWeightLbs: 135 }
          ]
        }
      });

      assert.equal(result.result, "repeated");
      assert.equal(result.nextWeightLbs, 135);
      assert.equal(result.nextRepGoal, 8);
      assert.equal(result.nextState.consecutiveFailures, 0);
      assert.match(result.reason, /too hard/i);
    }
  }
  ,
  {
    name: "ProgressionEngine (strategy) no_progression always returns skipped with a clear reason",
    run: () => {
      const result = engine.calculateWithStrategyV2({
        strategy: "no_progression",
        performedAt: new Date("2026-05-01T10:00:00.000Z"),
        state: {
          currentWeightLbs: 135,
          lastCompletedWeightLbs: 130,
          consecutiveFailures: 0,
          lastEffortFeedback: "just_right",
          lastPerformedAt: new Date("2026-04-28T10:00:00.000Z"),
          repGoal: 8,
          repRangeMin: 6,
          repRangeMax: 10
        },
        exercise: {
          exerciseName: "Bench Press",
          exerciseCategory: "compound",
          incrementLbs: 5,
          isBodyweight: false,
          isWeightOptional: false
        },
        outcome: {
          effortFeedback: "just_right",
          sets: [
            { targetReps: 8, actualReps: 8, targetWeightLbs: 135, actualWeightLbs: 135 },
            { targetReps: 8, actualReps: 8, targetWeightLbs: 135, actualWeightLbs: 135 },
            { targetReps: 8, actualReps: 8, targetWeightLbs: 135, actualWeightLbs: 135 }
          ]
        }
      });

      assert.equal(result.result, "skipped");
      assert.match(result.reason, /no_progression/i);
      assert.equal(result.nextWeightLbs, 135);
      assert.equal(result.nextRepGoal, 8);
    }
  },
  {
    name: "ProgressionEngine (strategy) fixed_weight increases weight but keeps rep goal fixed",
    run: () => {
      const result = engine.calculateWithStrategyV2({
        strategy: "fixed_weight",
        performedAt: new Date("2026-05-01T10:00:00.000Z"),
        state: {
          currentWeightLbs: 135,
          lastCompletedWeightLbs: 130,
          consecutiveFailures: 0,
          lastEffortFeedback: "just_right",
          lastPerformedAt: new Date("2026-04-28T10:00:00.000Z"),
          repGoal: 5,
          repRangeMin: 5,
          repRangeMax: 5
        },
        exercise: {
          exerciseName: "Bench Press",
          exerciseCategory: "compound",
          incrementLbs: 5,
          isBodyweight: false,
          isWeightOptional: false
        },
        outcome: {
          effortFeedback: "just_right",
          sets: [
            { targetReps: 5, actualReps: 5, targetWeightLbs: 135, actualWeightLbs: 135 },
            { targetReps: 5, actualReps: 5, targetWeightLbs: 135, actualWeightLbs: 135 },
            { targetReps: 5, actualReps: 5, targetWeightLbs: 135, actualWeightLbs: 135 }
          ]
        }
      });

      assert.equal(result.result, "increased");
      assert.equal(result.nextWeightLbs, 140);
      assert.equal(result.nextRepGoal, 5);
    }
  },
  {
    name: "ProgressionEngine (strategy) bodyweight_reps increases rep goal and never increases weight",
    run: () => {
      const result = engine.calculateWithStrategyV2({
        strategy: "bodyweight_reps",
        performedAt: new Date("2026-05-01T10:00:00.000Z"),
        state: {
          currentWeightLbs: 0,
          lastCompletedWeightLbs: null,
          consecutiveFailures: 0,
          lastEffortFeedback: "just_right",
          lastPerformedAt: new Date("2026-04-28T10:00:00.000Z"),
          repGoal: 8,
          repRangeMin: 6,
          repRangeMax: 10
        },
        exercise: {
          exerciseName: "Push Up",
          exerciseCategory: "accessory",
          incrementLbs: 5,
          isBodyweight: true,
          isWeightOptional: false
        },
        outcome: {
          effortFeedback: "just_right",
          sets: [
            { targetReps: 8, actualReps: 8, targetWeightLbs: 0, actualWeightLbs: 0 },
            { targetReps: 8, actualReps: 9, targetWeightLbs: 0, actualWeightLbs: 0 },
            { targetReps: 8, actualReps: 10, targetWeightLbs: 0, actualWeightLbs: 0 }
          ]
        }
      });

      assert.equal(result.result, "increased");
      assert.equal(result.nextWeightLbs, 0);
      assert.equal(result.nextRepGoal, 9);
    }
  },
  {
    name: "ProgressionEngine (strategy) bodyweight_weighted can progress from 0 external load without skipping",
    run: () => {
      const result = engine.calculateWithStrategyV2({
        strategy: "bodyweight_weighted",
        performedAt: new Date("2026-05-01T10:00:00.000Z"),
        state: {
          currentWeightLbs: 0,
          lastCompletedWeightLbs: null,
          consecutiveFailures: 0,
          lastEffortFeedback: "just_right",
          lastPerformedAt: new Date("2026-04-28T10:00:00.000Z"),
          repGoal: 10,
          repRangeMin: 6,
          repRangeMax: 10
        },
        exercise: {
          exerciseName: "Pull Up",
          exerciseCategory: "compound",
          incrementLbs: 5,
          isBodyweight: true,
          isWeightOptional: true
        },
        outcome: {
          effortFeedback: "just_right",
          sets: [
            { targetReps: 10, actualReps: 10, targetWeightLbs: 0, actualWeightLbs: 0 },
            { targetReps: 10, actualReps: 10, targetWeightLbs: 0, actualWeightLbs: 0 },
            { targetReps: 10, actualReps: 10, targetWeightLbs: 0, actualWeightLbs: 0 }
          ]
        }
      });

      assert.equal(result.result, "increased");
      assert.equal(result.nextWeightLbs, 5);
      assert.equal(result.nextRepGoal, 6);
    }
  }
];
