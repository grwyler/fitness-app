import { Pressable, Text } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import type { RootStackParamList } from "./navigation-types";
import { DashboardScreen } from "../../screens/DashboardScreen";
import { CreateProgramScreen } from "../../screens/CreateProgramScreen";
import { ActiveWorkoutScreen } from "../../screens/ActiveWorkoutScreen";
import { WorkoutSummaryScreen } from "../../screens/WorkoutSummaryScreen";
import { WorkoutHistoryScreen } from "../../screens/WorkoutHistoryScreen";
import { WorkoutHistoryDetailScreen } from "../../screens/WorkoutHistoryDetailScreen";
import { ProgressionScreen } from "../../screens/ProgressionScreen";
import { FeedbackDebugScreen } from "../../screens/FeedbackDebugScreen";
import { AuthLoadingScreen } from "../../screens/AuthLoadingScreen";
import { SignInScreen } from "../../screens/SignInScreen";
import { SignUpScreen } from "../../screens/SignUpScreen";
import { TrainingProfileScreen } from "../../screens/TrainingProfileScreen";
import { ProgressionPreferencesScreen } from "../../screens/ProgressionPreferencesScreen";
import { EquipmentSettingsScreen } from "../../screens/EquipmentSettingsScreen";
import { ExerciseProgressionSettingsScreen } from "../../screens/ExerciseProgressionSettingsScreen";
import { logSafeAuthDiagnostic } from "../auth/auth-debug";
import { colors } from "../../theme/tokens";
import { useAppAuth } from "../auth/AuthProvider";

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
        </>
      ) : (
        <>
          <Stack.Screen
            name="Dashboard"
            component={DashboardScreen}
            options={{
              title: "Dashboard",
              headerRight: () => (
                <Pressable onPress={() => void auth.signOut()}>
                  <Text style={{ color: colors.accentStrong, fontWeight: "600" }}>Sign Out</Text>
                </Pressable>
              )
            }}
          />
          <Stack.Screen
            name="ActiveWorkout"
            component={ActiveWorkoutScreen}
            options={{ title: "Active Workout" }}
          />
          <Stack.Screen
            name="CreateProgram"
            component={CreateProgramScreen}
            options={{ title: "Create Program" }}
          />
          <Stack.Screen
            name="WorkoutHistory"
            component={WorkoutHistoryScreen}
            options={{ title: "Workout History" }}
          />
          <Stack.Screen
            name="WorkoutHistoryDetail"
            component={WorkoutHistoryDetailScreen}
            options={{ title: "Workout Detail" }}
          />
          <Stack.Screen
            name="Progression"
            component={ProgressionScreen}
            options={{ title: "Progression" }}
          />
          <Stack.Screen
            name="WorkoutSummary"
            component={WorkoutSummaryScreen}
            options={{ title: "Workout Summary" }}
          />
          <Stack.Screen
            name="FeedbackDebug"
            component={FeedbackDebugScreen}
            options={{ title: "Feedback Debug" }}
          />
          <Stack.Screen
            name="TrainingProfile"
            component={TrainingProfileScreen}
            options={{ title: "Training Profile" }}
          />
          <Stack.Screen
            name="ProgressionPreferences"
            component={ProgressionPreferencesScreen}
            options={{ title: "Progression Preferences" }}
          />
          <Stack.Screen
            name="EquipmentSettings"
            component={EquipmentSettingsScreen}
            options={{ title: "Equipment Settings" }}
          />
          <Stack.Screen
            name="ExerciseProgressionSettings"
            component={ExerciseProgressionSettingsScreen}
            options={{ title: "Exercise Progression Settings" }}
          />
        </>
      )}
    </Stack.Navigator>
  );
}
