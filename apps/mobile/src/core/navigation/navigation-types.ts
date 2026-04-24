import type { CompleteWorkoutSessionResponse } from "@fitness/shared";

export type RootStackParamList = {
  Dashboard: undefined;
  ActiveWorkout: undefined;
  WorkoutSummary: {
    summary: CompleteWorkoutSessionResponse;
  };
};
