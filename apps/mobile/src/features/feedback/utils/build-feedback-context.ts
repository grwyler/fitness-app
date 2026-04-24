import type { FeedbackContext } from "../types.js";

type BuildFeedbackContextInput = {
  screenName: string;
  routeName: string;
  workoutSessionId?: string | null;
  platform: string;
  appVersion?: string | null;
  lastAction?: string | null;
  now?: Date;
};

export function buildFeedbackContext(input: BuildFeedbackContextInput): FeedbackContext {
  return {
    screenName: input.screenName,
    routeName: input.routeName,
    timestamp: (input.now ?? new Date()).toISOString(),
    platform: input.platform,
    workoutSessionId: input.workoutSessionId ?? null,
    appVersion: input.appVersion ?? null,
    ...(input.lastAction ? { lastAction: input.lastAction } : {})
  };
}
