import type { CompleteWorkoutSessionResponse, ProgramWorkoutTemplateDto } from "@fitness/shared";
import type { CustomWorkoutBuilderMode } from "../../features/workout/utils/custom-workout-builder.shared";

export type RootStackParamList = {
  SignIn:
    | {
        token?: string;
      }
    | undefined;
  SignUp: undefined;
  ForgotPassword: undefined;
  ResetPassword:
    | {
        email?: string;
        token?: string;
      }
    | undefined;
  Dashboard: undefined;
  CreateProgram:
    | {
        editProgramId?: string;
        cloneProgramId?: string;
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
  AdminDashboard: undefined;
  AdminFeedback: undefined;
  TrainingProfile: undefined;
  ProgressionPreferences: undefined;
  EquipmentSettings: undefined;
  ExerciseProgressionSettings: undefined;
};
