import { createNativeStackNavigator } from "@react-navigation/native-stack";
import type { RootStackParamList } from "./navigation-types";
import { DashboardScreen } from "../../screens/DashboardScreen";
import { CreateProgramScreen } from "../../screens/CreateProgramScreen";
import { ActiveWorkoutScreen } from "../../screens/ActiveWorkoutScreen";
import { WorkoutSummaryScreen } from "../../screens/WorkoutSummaryScreen";
import { WorkoutHistoryScreen } from "../../screens/WorkoutHistoryScreen";
import { WorkoutHistoryDetailScreen } from "../../screens/WorkoutHistoryDetailScreen";
import { ProgressionScreen } from "../../screens/ProgressionScreen";
import { AdminDashboardScreen } from "../../screens/AdminDashboardScreen";
import { AdminFeedbackScreen } from "../../screens/AdminFeedbackScreen";
import { AuthLoadingScreen } from "../../screens/AuthLoadingScreen";
import { SignInScreen } from "../../screens/SignInScreen";
import { SignUpScreen } from "../../screens/SignUpScreen";
import { ForgotPasswordScreen } from "../../screens/ForgotPasswordScreen";
import { ResetPasswordScreen } from "../../screens/ResetPasswordScreen";
import { TrainingProfileScreen } from "../../screens/TrainingProfileScreen";
import { ProgressionPreferencesScreen } from "../../screens/ProgressionPreferencesScreen";
import { EquipmentSettingsScreen } from "../../screens/EquipmentSettingsScreen";
import { ExerciseProgressionSettingsScreen } from "../../screens/ExerciseProgressionSettingsScreen";
import { logSafeAuthDiagnostic } from "../auth/auth-debug";
import { colors } from "../../theme/tokens";
import { useAppAuth } from "../auth/AuthProvider";
import { UserMenuButton } from "./UserMenuButton";

const Stack = createNativeStackNavigator<RootStackParamList>();

export function AppNavigator() {
  const auth = useAppAuth();

  logSafeAuthDiagnostic("navigator_auth_status", {
    status: auth.status
  });

  if (auth.status === "checking_session") {
    return <AuthLoadingScreen />;
  }

  return (
    <Stack.Navigator
      key={auth.status}
      id="root-stack"
      initialRouteName={auth.status === "authenticated" ? "Dashboard" : "SignIn"}
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.surface
        },
        headerTintColor: colors.textPrimary,
        contentStyle: {
          backgroundColor: colors.background
        }
      }}
    >
      {auth.status === "unauthenticated" ? (
        <>
          <Stack.Screen name="SignIn" component={SignInScreen} options={{ title: "Sign In" }} />
          <Stack.Screen name="SignUp" component={SignUpScreen} options={{ title: "Sign Up" }} />
          <Stack.Screen
            name="ForgotPassword"
            component={ForgotPasswordScreen}
            options={{ title: "Forgot Password" }}
          />
          <Stack.Screen
            name="ResetPassword"
            component={ResetPasswordScreen}
            options={{ title: "Reset Password" }}
          />
        </>
      ) : (
        <>
          <Stack.Screen
            name="Dashboard"
            component={DashboardScreen}
            options={{
              title: "Dashboard",
              headerRight: () => <UserMenuButton />
            }}
          />
          <Stack.Screen
            name="ActiveWorkout"
            component={ActiveWorkoutScreen}
            options={{ title: "Active Workout", headerRight: () => <UserMenuButton /> }}
          />
          <Stack.Screen
            name="CreateProgram"
            component={CreateProgramScreen}
            options={{ title: "Create Program", headerRight: () => <UserMenuButton /> }}
          />
          <Stack.Screen
            name="WorkoutHistory"
            component={WorkoutHistoryScreen}
            options={{ title: "Workout History", headerRight: () => <UserMenuButton /> }}
          />
          <Stack.Screen
            name="WorkoutHistoryDetail"
            component={WorkoutHistoryDetailScreen}
            options={{ title: "Workout Detail", headerRight: () => <UserMenuButton /> }}
          />
          <Stack.Screen
            name="Progression"
            component={ProgressionScreen}
            options={{ title: "Progression", headerRight: () => <UserMenuButton /> }}
          />
          <Stack.Screen
            name="WorkoutSummary"
            component={WorkoutSummaryScreen}
            options={{ title: "Workout Summary", headerRight: () => <UserMenuButton /> }}
          />
          {auth.isAdmin ? (
            <>
              <Stack.Screen
                name="AdminDashboard"
                component={AdminDashboardScreen}
                options={{ title: "Admin Dashboard", headerRight: () => <UserMenuButton /> }}
              />
              <Stack.Screen
                name="AdminFeedback"
                component={AdminFeedbackScreen}
                options={{ title: "Feedback", headerRight: () => <UserMenuButton /> }}
              />
            </>
          ) : null}
          <Stack.Screen
            name="TrainingProfile"
            component={TrainingProfileScreen}
            options={{ title: "Training Profile", headerRight: () => <UserMenuButton /> }}
          />
          <Stack.Screen
            name="ProgressionPreferences"
            component={ProgressionPreferencesScreen}
            options={{ title: "Progression Preferences", headerRight: () => <UserMenuButton /> }}
          />
          <Stack.Screen
            name="EquipmentSettings"
            component={EquipmentSettingsScreen}
            options={{ title: "Equipment Settings", headerRight: () => <UserMenuButton /> }}
          />
          <Stack.Screen
            name="ExerciseProgressionSettings"
            component={ExerciseProgressionSettingsScreen}
            options={{ title: "Exercise Progression Settings", headerRight: () => <UserMenuButton /> }}
          />
          <Stack.Screen
            name="ForgotPassword"
            component={ForgotPasswordScreen}
            options={{ title: "Forgot Password" }}
          />
          <Stack.Screen
            name="ResetPassword"
            component={ResetPasswordScreen}
            options={{ title: "Reset Password" }}
          />
        </>
      )}
    </Stack.Navigator>
  );
}
