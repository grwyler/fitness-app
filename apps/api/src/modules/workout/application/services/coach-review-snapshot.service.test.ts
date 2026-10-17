import assert from "node:assert/strict";
import type { ApplicationTestCase } from "../test-helpers/application-test-case.js";
import { buildCoachReviewSnapshot } from "./coach-review-snapshot.service.js";

export const coachReviewSnapshotServiceTestCases: ApplicationTestCase[] = [
  {
    name: "Coach review: not_started when no completed workouts in block",
    run: () => {
      const snapshot = buildCoachReviewSnapshot({
        targetWorkoutsPerWeek: 4,
        completedWorkoutsThisWeek: 0,
        completedWorkoutsTotal: 0,
        unresolvedRecommendationsThisWeek: 0
      });
      assert.equal(snapshot.status, "not_started");
    }
  },
  {
    name: "Coach review: on_track when completed meets target",
    run: () => {
      const snapshot = buildCoachReviewSnapshot({
        targetWorkoutsPerWeek: 4,
        completedWorkoutsThisWeek: 4,
        completedWorkoutsTotal: 6,
        unresolvedRecommendationsThisWeek: 0
      });
      assert.equal(snapshot.status, "on_track");
    }
  },
  {
    name: "Coach review: needs_attention when one below target",
    run: () => {
      const snapshot = buildCoachReviewSnapshot({
        targetWorkoutsPerWeek: 4,
        completedWorkoutsThisWeek: 3,
        completedWorkoutsTotal: 6,
        unresolvedRecommendationsThisWeek: 0
      });
      assert.equal(snapshot.status, "needs_attention");
    }
  },
  {
    name: "Coach review: off_track when far below target",
    run: () => {
      const snapshot = buildCoachReviewSnapshot({
        targetWorkoutsPerWeek: 4,
        completedWorkoutsThisWeek: 1,
        completedWorkoutsTotal: 6,
        unresolvedRecommendationsThisWeek: 0
      });
      assert.equal(snapshot.status, "off_track");
    }
  },
  {
    name: "Coach review: unresolved recommendations elevate to needs_attention",
    run: () => {
      const snapshot = buildCoachReviewSnapshot({
        targetWorkoutsPerWeek: 4,
        completedWorkoutsThisWeek: 4,
        completedWorkoutsTotal: 6,
        unresolvedRecommendationsThisWeek: 1
      });
      assert.equal(snapshot.status, "needs_attention");
      assert.ok(snapshot.attentionItems.some((item) => item.includes("unresolved")));
    }
  }
];

