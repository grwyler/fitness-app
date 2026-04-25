import { Pressable, Text } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import type { RootStackParamList } from "./navigation-types";
import { DashboardScreen } from "../../screens/DashboardScreen";
import { ActiveWorkoutScreen } from "../../screens/ActiveWorkoutScreen";
import { WorkoutSummaryScreen } from "../../screens/WorkoutSummaryScreen";
import { FeedbackDebugScreen } from "../../screens/FeedbackDebugScreen";
import { AuthLoadingScreen } from "../../screens/AuthLoadingScreen";
import { SignInScreen } from "../../screens/SignInScreen";
import { SignUpScreen } from "../../screens/SignUpScreen";
import { colors } from "../../theme/tokens";
import { useAppAuth } from "../auth/AuthProvider";

const Stack = createNativeStackNavigator<RootStackParamList>();

export function AppNavigator() {
  const auth = useAppAuth();

  if (auth.status === "checking_session") {
    return <AuthLoadingScreen />;
  }

  return (
    <Stack.Navigator
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
                  <Text style={{ color: colors.accentStrong, fontWeight: "700" }}>Sign Out</Text>
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
        </>
      )}
    </Stack.Navigator>
  );
}
