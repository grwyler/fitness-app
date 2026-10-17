import assert from "node:assert/strict";
import type { ManualProgramGoalContextDto, TrainingBlockCoachReviewDto } from "@fitness/shared";
import { getDashboardGoalContextModel } from "../features/workout/utils/dashboard-goal-context.shared.js";
import type { MobileTestCase } from "./mobile-test-case.js";

const baseContext: ManualProgramGoalContextDto = {
  goalType: "hypertrophy",
  plannedWeeks: 8,
  targetWorkoutsPerWeek: 4,
  progressionStyle: "balanced"
};

export const dashboardGoalContextTestCases: MobileTestCase[] = [
  {
    name: "Dashboard goal model shows Add goal when no context exists",
    run: () => {
      const model = getDashboardGoalContextModel({ manualGoalContext: null, coachReview: null });
      assert.equal(model.ctaLabel, "Add goal");
      assert.match(model.title, /No goal attached/);
    }
  },
  {
    name: "Dashboard goal model shows Edit goal and formats week when training block exists",
    run: () => {
      const coachReview: TrainingBlockCoachReviewDto = {
        trainingBlock: {
          id: "block-1",
          programId: "program-1",
          name: "Training block",
          source: "manual",
          status: "active",
          startDate: "2026-05-01T00:00:00.000Z",
          currentWeek: 1,
          plannedWeeks: 8,
          targetWorkoutsPerWeek: 4,
          progressionStyle: "balanced",
          completedWorkoutsThisWeek: 0,
          completedWorkoutsTotal: 0
        },
        coachReview: {
          status: "not_started",
          highlights: [],
          attentionItems: [],
          recommendations: [],
          evidence: []
        }
      };

      const model = getDashboardGoalContextModel({ manualGoalContext: baseContext, coachReview });
      assert.equal(model.ctaLabel, "Edit goal");
      assert.match(model.title, /Goal:/);
      assert.match(model.detail, /Week 1 of 8/);
      assert.ok(model.detail.includes("Target: 4 workouts/week"));
    }
  },
  {
    name: "Dashboard goal model falls back to planned weeks when no training block exists",
    run: () => {
      const model = getDashboardGoalContextModel({ manualGoalContext: baseContext, coachReview: null });
      assert.equal(model.ctaLabel, "Edit goal");
      assert.match(model.detail, /Planned: 8 weeks/);
      assert.ok(model.detail.includes("Target: 4 workouts/week"));
    }
  }
];
