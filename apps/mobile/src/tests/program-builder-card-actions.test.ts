import assert from "node:assert/strict";
import type { MobileTestCase } from "./mobile-test-case.js";
import {
  EXERCISE_CARD_LAYOUT_VARIANT,
  getExerciseEntryOverflowActionLabels,
  getExerciseEntryPrimaryActionLabels,
  WORKOUT_CARD_LAYOUT_VARIANT,
  getWorkoutCardActionVisibility,
  getWorkoutEntryOverflowActionLabels,
  getWorkoutEntryPrimaryActionLabels
} from "../features/workout/utils/program-day-workout-builder-card.shared.js";

export const programBuilderCardActionsTestCases: MobileTestCase[] = [
  {
    name: "Program builder exercise cards use stacked layout variant for readability",
    run: () => {
      assert.equal(EXERCISE_CARD_LAYOUT_VARIANT, "stacked_v1");
    }
  },
  {
    name: "Program builder primary exercise actions are minimal",
    run: () => {
      const primary = getExerciseEntryPrimaryActionLabels();
      const overflow = getExerciseEntryOverflowActionLabels();
      const primaryLabels = Object.values(primary) as string[];

      assert.deepEqual(primaryLabels.slice().sort(), ["Edit", "More"]);
      assert.equal(primaryLabels.includes(overflow.moveUp), false);
      assert.equal(primaryLabels.includes(overflow.moveDown), false);
      assert.equal(primaryLabels.includes(overflow.remove), false);
    }
  },
  {
    name: "Program builder overflow exercise actions include reorder and remove",
    run: () => {
      const overflow = getExerciseEntryOverflowActionLabels();
      const labels = Object.values(overflow);

      assert.ok(labels.includes("Move up"));
      assert.ok(labels.includes("Move down"));
      assert.ok(labels.includes("Remove exercise"));
    }
  }
  ,
  {
    name: "Program builder workout cards use stacked layout variant for readability",
    run: () => {
      assert.equal(WORKOUT_CARD_LAYOUT_VARIANT, "stacked_v1");
    }
  },
  {
    name: "Program builder workout actions keep duplicate and remove available (in overflow)",
    run: () => {
      const primary = getWorkoutEntryPrimaryActionLabels();
      const overflow = getWorkoutEntryOverflowActionLabels();

      assert.deepEqual(Object.values(primary).slice().sort(), ["Add exercise", "More"]);
      assert.ok(Object.values(overflow).includes("Duplicate workout"));
      assert.ok(Object.values(overflow).includes("Remove workout"));
    }
  },
  {
    name: "Empty workout cards show Add exercise and More in the header",
    run: () => {
      const visibility = getWorkoutCardActionVisibility({ isEmpty: true });
      assert.equal(visibility.showHeaderAddExercise, true);
      assert.equal(visibility.showHeaderMore, true);
      assert.equal(visibility.showFooterAddExercise, false);
    }
  },
  {
    name: "Non-empty workout cards show More in header and Add exercise in footer",
    run: () => {
      const visibility = getWorkoutCardActionVisibility({ isEmpty: false });
      assert.equal(visibility.showHeaderAddExercise, false);
      assert.equal(visibility.showHeaderMore, true);
      assert.equal(visibility.showFooterAddExercise, true);
    }
  }
];
