import { useState } from "react";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { StyleSheet, Text, View } from "react-native";
import { Screen } from "../components/Screen";
import { LoadingState } from "../components/LoadingState";
import { ErrorState } from "../components/ErrorState";
import { PrimaryButton } from "../components/PrimaryButton";
import { FeedbackButton } from "../features/feedback/components/FeedbackButton";
import { useDashboard } from "../features/workout/hooks/useDashboard";
import { useStartWorkout } from "../features/workout/hooks/useStartWorkout";
import type { RootStackParamList } from "../core/navigation/navigation-types";
import { colors, spacing } from "../theme/tokens";

type Props = NativeStackScreenProps<RootStackParamList, "Dashboard">;

export function DashboardScreen({ navigation }: Props) {
  const dashboardQuery = useDashboard();
  const startWorkoutMutation = useStartWorkout();
  const [lastAction, setLastAction] = useState<string | null>(null);

  if (dashboardQuery.isLoading) {
    return (
      <Screen>
        <LoadingState label="Loading your dashboard..." />
      </Screen>
    );
  }

  if (dashboardQuery.isError || !dashboardQuery.data) {
    return (
      <Screen>
        <ErrorState
          title="Dashboard unavailable"
          message="We couldn't load your workout dashboard."
          actionLabel="Try again"
          onAction={() => void dashboardQuery.refetch()}
        />
      </Screen>
    );
  }

  const dashboard = dashboardQuery.data;
  const activeWorkout = dashboard.activeWorkoutSession;
  const nextWorkout = dashboard.nextWorkoutTemplate;

  return (
    <Screen>
      <View style={styles.hero}>
        <Text style={styles.eyebrow}>Fitness App</Text>
        <Text style={styles.title}>Train with a clear next step.</Text>
        <Text style={styles.subtitle}>
          Your dashboard is powered by the live workout API.
        </Text>
      </View>

      {activeWorkout ? (
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Active workout</Text>
          <Text style={styles.cardTitle}>{activeWorkout.workoutName}</Text>
          <Text style={styles.cardBody}>
            {activeWorkout.exercises.length} exercises in progress
          </Text>
          <PrimaryButton
            label="Resume workout"
            onPress={() => {
              setLastAction("resume_workout");
              navigation.navigate("ActiveWorkout");
            }}
          />
        </View>
      ) : null}

      <View style={styles.card}>
        <Text style={styles.cardLabel}>Next workout</Text>
        <Text style={styles.cardTitle}>{nextWorkout?.name ?? "No workout queued"}</Text>
        <Text style={styles.cardBody}>
          {nextWorkout
            ? `Estimated ${nextWorkout.estimatedDurationMinutes ?? 0} minutes`
            : "No active program enrollment is available."}
        </Text>
        <PrimaryButton
          label={activeWorkout ? "Workout already active" : "Start workout"}
          onPress={() => {
            setLastAction("start_workout");
            startWorkoutMutation.mutate(
              {},
              {
                onSuccess: () => {
                  navigation.navigate("ActiveWorkout");
                }
              }
            );
          }}
          disabled={Boolean(activeWorkout || !nextWorkout)}
          loading={startWorkoutMutation.isPending}
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardLabel}>This week</Text>
        <Text style={styles.cardTitle}>{dashboard.weeklyWorkoutCount} workouts completed</Text>
        <Text style={styles.cardBody}>
          Recent activity: {dashboard.recentProgressMetrics[0]?.displayText ?? "No progress metrics yet."}
        </Text>
      </View>

      <View style={styles.actions}>
        <FeedbackButton
          screenName="DashboardScreen"
          workoutSessionId={activeWorkout?.id ?? null}
          lastAction={lastAction}
        />
        {__DEV__ ? (
          <PrimaryButton
            label="Review feedback"
            tone="secondary"
            onPress={() => navigation.navigate("FeedbackDebug")}
          />
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    gap: spacing.sm
  },
  eyebrow: {
    color: colors.accentStrong,
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 1.1,
    textTransform: "uppercase"
  },
  title: {
    color: colors.textPrimary,
    fontSize: 30,
    fontWeight: "800",
    lineHeight: 36
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 16,
    lineHeight: 22
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 22,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.lg
  },
  cardLabel: {
    color: colors.accentStrong,
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase"
  },
  cardTitle: {
    color: colors.textPrimary,
    fontSize: 24,
    fontWeight: "700"
  },
  cardBody: {
    color: colors.textSecondary,
    fontSize: 16,
    lineHeight: 22
  },
  actions: {
    gap: spacing.sm
  }
});
