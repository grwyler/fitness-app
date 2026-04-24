import { createNativeStackNavigator } from "@react-navigation/native-stack";
import type { RootStackParamList } from "./navigation-types";
import { DashboardScreen } from "../../screens/DashboardScreen";
import { ActiveWorkoutScreen } from "../../screens/ActiveWorkoutScreen";
import { WorkoutSummaryScreen } from "../../screens/WorkoutSummaryScreen";
import { FeedbackDebugScreen } from "../../screens/FeedbackDebugScreen";
import { colors } from "../../theme/tokens";

const Stack = createNativeStackNavigator<RootStackParamList>();

export function AppNavigator() {
  return (
    <Stack.Navigator
      id="root-stack"
      initialRouteName="Dashboard"
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
      <Stack.Screen name="Dashboard" component={DashboardScreen} options={{ title: "Dashboard" }} />
      <Stack.Screen
        name="ActiveWorkout"
        component={ActiveWorkoutScreen}
        options={{ title: "Active Workout" }}
      />
      <Stack.Screen
        name="WorkoutSummary"
        component={WorkoutSummaryScreen}
        options={{ title: "Workout Summary" }}
      />
      {__DEV__ ? (
        <Stack.Screen
          name="FeedbackDebug"
          component={FeedbackDebugScreen}
          options={{ title: "Feedback Debug" }}
        />
      ) : null}
    </Stack.Navigator>
  );
}
