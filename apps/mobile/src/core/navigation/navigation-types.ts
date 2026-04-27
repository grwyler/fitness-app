import type { CompleteWorkoutSessionResponse } from "@fitness/shared";

export type RootStackParamList = {
  SignIn: undefined;
  SignUp: undefined;
  Dashboard: undefined;
  ActiveWorkout: undefined;
  WorkoutHistory: undefined;
  Progression: undefined;
  WorkoutSummary: {
    summary: CompleteWorkoutSessionResponse;
  };
  FeedbackDebug: undefined;
};
