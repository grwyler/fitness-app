import type { CompleteWorkoutSessionResponse, ProgramWorkoutTemplateDto } from "@fitness/shared";
import type { CustomWorkoutBuilderMode } from "../../features/workout/utils/custom-workout-builder.shared";

export type RootStackParamList = {
  SignIn: undefined;
  SignUp: undefined;
  Dashboard: undefined;
  CreateProgram:
    | {
        assignedDayNumber?: number;
        assignedWorkout?: ProgramWorkoutTemplateDto;
        assignmentId?: string;
      }
    | undefined;
  ActiveWorkout:
    | {
        mode?: CustomWorkoutBuilderMode;
        programDayNumber?: number;
      }
    | undefined;
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
