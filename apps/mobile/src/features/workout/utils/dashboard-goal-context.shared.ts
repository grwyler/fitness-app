import type { ManualProgramGoalContextDto, TrainingBlockCoachReviewDto } from "@fitness/shared";

export function formatManualProgramGoalType(value: ManualProgramGoalContextDto["goalType"]): string {
  switch (value) {
    case "hypertrophy":
      return "Build muscle";
    case "strength":
      return "Get stronger";
    case "general_fitness":
      return "General fitness";
    case "consistency":
      return "Consistency";
    case "sport_support":
      return "Sport support";
    case "custom":
    default:
      return "Custom";
  }
}

function formatCoachReviewStatus(
  value: NonNullable<TrainingBlockCoachReviewDto["coachReview"]>["status"]
): string {
  switch (value) {
    case "not_started":
      return "Not started";
    case "on_track":
      return "On track";
    case "needs_attention":
      return "Needs attention";
    case "off_track":
      return "Off track";
  }
}

export type DashboardGoalContextModel = {
  title: string;
  detail: string;
  ctaLabel: "Add goal" | "Edit goal";
};

export function getDashboardGoalContextModel(input: {
  manualGoalContext: ManualProgramGoalContextDto | null;
  coachReview: TrainingBlockCoachReviewDto | null;
}): DashboardGoalContextModel {
  if (!input.manualGoalContext) {
    return {
      title: "No goal attached",
      detail: "Add a goal if you want the app to monitor this program.",
      ctaLabel: "Add goal"
    };
  }

  const goal = formatManualProgramGoalType(input.manualGoalContext.goalType);
  const trainingBlock = input.coachReview?.trainingBlock ?? null;
  const coachReview = input.coachReview?.coachReview ?? null;

  const detail = (() => {
    if (trainingBlock) {
      const statusSuffix = coachReview ? ` · ${formatCoachReviewStatus(coachReview.status)}` : "";
      return `Week ${trainingBlock.currentWeek} of ${trainingBlock.plannedWeeks} · Target: ${trainingBlock.targetWorkoutsPerWeek} workouts/week${statusSuffix}`;
    }

    return `Planned: ${input.manualGoalContext.plannedWeeks} weeks · Target: ${input.manualGoalContext.targetWorkoutsPerWeek} workouts/week`;
  })();

  return {
    title: `Goal: ${goal}`,
    detail,
    ctaLabel: "Edit goal"
  };
}
