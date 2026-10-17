import type { CoachReviewStatus } from "@fitness/shared";

export type CoachReviewSnapshot = {
  status: CoachReviewStatus;
  highlights: string[];
  attentionItems: string[];
  recommendations: string[];
  evidence: string[];
};

export function buildCoachReviewSnapshot(input: {
  targetWorkoutsPerWeek: number;
  completedWorkoutsThisWeek: number;
  completedWorkoutsTotal: number;
  unresolvedRecommendationsThisWeek: number;
}): CoachReviewSnapshot {
  const highlights: string[] = [];
  const attentionItems: string[] = [];
  const recommendations: string[] = [];
  const evidence: string[] = [];

  if (input.completedWorkoutsTotal <= 0) {
    return {
      status: "not_started",
      highlights: ["Training block created."],
      attentionItems: [],
      recommendations: ["Start your first workout to begin tracking toward your goal."],
      evidence
    };
  }

  const weeklyGap = input.targetWorkoutsPerWeek - input.completedWorkoutsThisWeek;

  let status: CoachReviewStatus;
  if (weeklyGap <= 0) {
    status = "on_track";
    highlights.push("You’ve hit your weekly workout target.");
  } else if (weeklyGap === 1) {
    status = "needs_attention";
    attentionItems.push("You’re one workout away from your weekly target.");
    recommendations.push("Schedule one more workout this week to stay on track.");
  } else {
    status = "off_track";
    attentionItems.push("You’re below your weekly workout target.");
    recommendations.push("Aim to complete at least one more workout this week.");
  }

  if (input.unresolvedRecommendationsThisWeek > 0) {
    attentionItems.push(
      `${input.unresolvedRecommendationsThisWeek} unresolved progression recommendation${
        input.unresolvedRecommendationsThisWeek === 1 ? "" : "s"
      }`
    );
    if (status === "on_track") {
      status = "needs_attention";
    }
  }

  return {
    status,
    highlights,
    attentionItems,
    recommendations,
    evidence
  };
}

