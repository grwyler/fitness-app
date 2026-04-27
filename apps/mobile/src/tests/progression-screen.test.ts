import assert from "node:assert/strict";
import {
  formatProgressionVolume,
  formatProgressionWeight,
  getProgressionEmptyState
} from "../features/workout/utils/progression-screen.shared.js";
import type { MobileTestCase } from "./mobile-test-case.js";

export const progressionScreenTestCases: MobileTestCase[] = [
  {
    name: "Progression screen helpers format empty and loaded states",
    run: () => {
      assert.equal(getProgressionEmptyState(null), true);
      assert.equal(
        getProgressionEmptyState({
          totalCompletedWorkouts: 1,
          workoutsCompletedThisWeek: 1,
          currentStreakDays: 1,
          recentWorkoutVolume: [],
          exercises: [],
          assumptions: []
        }),
        false
      );
      assert.equal(formatProgressionWeight(135), "135 lb");
      assert.equal(formatProgressionWeight(null), "No weight yet");
      assert.equal(formatProgressionVolume(3240), "3,240 lb");
    }
  }
];
