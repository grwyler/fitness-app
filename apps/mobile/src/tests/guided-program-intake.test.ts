import assert from "node:assert/strict";
import { buildGuidedProgramAnswersV2, getGuidedProgramSavedForLaterPreferences } from "../features/workout/utils/guided-program-intake.shared.js";
import type { MobileTestCase } from "./mobile-test-case.js";

export const guidedProgramIntakeTestCases: MobileTestCase[] = [
  {
    name: "Guided program intake builds a core-only V2 profile without refinement fields",
    run: () => {
      const answers = buildGuidedProgramAnswersV2({
        includeRefinement: false,
        goal: "general_fitness",
        experienceLevel: "beginner",
        daysPerWeek: 3,
        scheduleFlexibility: "some_flex",
        sessionDurationMinutes: 45,
        sessionDurationFlexibility: "some_flex",
        equipmentAccess: "full_gym",
        avoidEquipment: [],
        progressionAggressiveness: "balanced",
        recoveryPreference: "adjust_when_needed",
        trainingStylePreference: null,
        focusAreas: [],
        busyWeekPreference: null,
        recoveryTolerance: null,
        exerciseExclusions: "  "
      });

      assert.equal(answers.version, 2);
      assert.equal(answers.intakeDepth, "core");
      assert.deepEqual(answers.equipment.avoid, undefined);
      assert.equal(answers.preferences.trainingStylePreference, undefined);
      assert.equal(answers.preferences.focusAreas, undefined);
      assert.equal(answers.preferences.exerciseExclusions, null);
      assert.deepEqual(getGuidedProgramSavedForLaterPreferences(answers), []);
    }
  },
  {
    name: "Guided program intake builds a refined V2 profile and trims optional constraints",
    run: () => {
      const answers = buildGuidedProgramAnswersV2({
        includeRefinement: true,
        goal: "strength",
        experienceLevel: "intermediate",
        daysPerWeek: 4,
        scheduleFlexibility: "strict",
        sessionDurationMinutes: 60,
        sessionDurationFlexibility: "strict",
        equipmentAccess: "barbell_rack",
        avoidEquipment: ["machine"],
        progressionAggressiveness: "aggressive",
        recoveryPreference: "small_adjustments_only",
        trainingStylePreference: null,
        focusAreas: ["arms"],
        busyWeekPreference: "shorter_sessions",
        recoveryTolerance: "low",
        exerciseExclusions: "No overhead pressing  "
      });

      assert.equal(answers.version, 2);
      assert.equal(answers.intakeDepth, "refined");
      assert.deepEqual(answers.equipment.avoid, ["machine"]);
      assert.equal(answers.preferences.trainingStylePreference, "no_preference");
      assert.deepEqual(answers.preferences.focusAreas, ["arms"]);
      assert.equal(answers.preferences.exerciseExclusions, "No overhead pressing");
      assert.deepEqual(getGuidedProgramSavedForLaterPreferences(answers), [
        "Focus areas",
        "Busy-week preference",
        "Recovery tolerance",
        "Exercise exclusions"
      ]);
    }
  }
];

