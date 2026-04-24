export const feedbackCategories = [
  "Flow Friction",
  "Confusing",
  "Slow",
  "Missing Feedback",
  "Bug",
  "Idea"
] as const;

export const feedbackSeverities = ["High", "Medium", "Low"] as const;

export type FeedbackCategory = (typeof feedbackCategories)[number];
export type FeedbackSeverity = (typeof feedbackSeverities)[number];

export type FeedbackContext = {
  screenName: string;
  routeName: string;
  timestamp: string;
  platform: string;
  workoutSessionId: string | null;
  appVersion: string | null;
  lastAction?: string;
};

export type FeedbackDraft = {
  description: string;
  category: FeedbackCategory;
  severity: FeedbackSeverity;
};

export type FeedbackEntry = FeedbackDraft & {
  id: string;
  createdAt: string;
  context: FeedbackContext;
};

export function createFeedbackEntry(input: {
  draft: FeedbackDraft;
  context: FeedbackContext;
  id?: string;
}): FeedbackEntry {
  return {
    id: input.id ?? `${input.context.timestamp}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: input.context.timestamp,
    description: input.draft.description.trim(),
    category: input.draft.category,
    severity: input.draft.severity,
    context: input.context
  };
}
