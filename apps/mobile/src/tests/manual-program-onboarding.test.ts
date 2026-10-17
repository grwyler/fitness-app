import assert from "node:assert/strict";
import type { MobileTestCase } from "./mobile-test-case.js";
import { getManualProgramEmptyStateCopy } from "../features/workout/utils/dashboard-empty-state.shared.js";
import { getMvpProgramEntryPoints } from "../features/workout/utils/mvp-program-entrypoints.shared.js";

export const manualProgramOnboardingTestCases: MobileTestCase[] = [
  {
    name: "Dashboard empty state directs user to manual program creation",
    run: () => {
      const copy = getManualProgramEmptyStateCopy();
      assert.equal(copy.title, "Create your training program");
      assert.equal(
        copy.subtitle,
        "Build your workouts, then let the app handle logging, progression, and adjustments."
      );
      assert.equal(copy.primaryCtaLabel, "Create Program");
    }
  },
  {
    name: "MVP entry points keep catalog and recommended programs hidden",
    run: () => {
      const entryPoints = getMvpProgramEntryPoints();
      assert.equal(entryPoints.manualProgramCreation, true);
      assert.equal(entryPoints.catalogLookup, false);
      assert.equal(entryPoints.recommendedPrograms, false);
    }
  }
];

