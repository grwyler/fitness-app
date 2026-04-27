import type { CompleteWorkoutSessionResponse } from "@fitness/shared";

export type RootStackParamList = {
  SignIn: undefined;
  SignUp: undefined;
  Dashboard: undefined;
  ActiveWorkout: undefined;
  WorkoutHistory: undefined;
  WorkoutHistoryDetail: {
    sessionId: string;
  };
  Progression: undefined;
  WorkoutSummary: {
    summary: CompleteWorkoutSessionResponse;
  };
  FeedbackDebug: undefined;
};
