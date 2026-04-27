import { useState } from "react";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { StyleSheet, Text, View } from "react-native";
import { Screen } from "../components/Screen";
import { LoadingState } from "../components/LoadingState";
import { ErrorState } from "../components/ErrorState";
import { PrimaryButton } from "../components/PrimaryButton";
import { FeedbackButton } from "../features/feedback/components/FeedbackButton";
import { useDashboard } from "../features/workout/hooks/useDashboard";
import { useFollowProgram } from "../features/workout/hooks/useFollowProgram";
import { usePrograms } from "../features/workout/hooks/usePrograms";
import { useStartWorkout } from "../features/workout/hooks/useStartWorkout";
import type { RootStackParamList } from "../core/navigation/navigation-types";
import { colors, spacing } from "../theme/tokens";

type Props = NativeStackScreenProps<RootStackParamList, "Dashboard">;

export function DashboardScreen({ navigation }: Props) {
  const dashboardQuery = useDashboard();
  const programsQuery = usePrograms(Boolean(dashboardQuery.data && !dashboardQuery.data.activeProgram));
  const followProgramMutation = useFollowProgram();
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
  const activeProgram = dashboard.activeProgram;
  const activeWorkout = dashboard.activeWorkoutSession;
  const nextWorkout = dashboard.nextWorkoutTemplate;
  const availablePrograms = programsQuery.data ?? [];

  return (
    <Screen>
      <View style={styles.hero}>
        <Text style={styles.eyebrow}>Fitness App</Text>
        <Text style={styles.title}>
          {activeProgram ? "Train with a clear next step." : "Choose your starting plan."}
        </Text>
        <Text style={styles.subtitle}>
          {activeProgram
            ? "Follow the program, log the work, and let progression handle the details."
            : "Pick a predefined program to queue your first workout."}
        </Text>
      </View>

      {activeProgram ? (
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Current program</Text>
          <Text style={styles.cardTitle}>{activeProgram.program.name}</Text>
          <Text style={styles.cardBody}>{activeProgram.program.description}</Text>
          <Text style={styles.metaLine}>
            {activeProgram.program.daysPerWeek} days/week - {activeProgram.program.sessionDurationMinutes} min sessions - {activeProgram.completedWorkoutCount} completed
          </Text>
        </View>
      ) : null}

      {!activeProgram ? (
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Predefined programs</Text>
          {programsQuery.isLoading ? (
            <Text style={styles.cardBody}>Loading programs...</Text>
          ) : availablePrograms.length === 0 ? (
            <Text style={styles.cardBody}>No active predefined programs are available yet.</Text>
          ) : (
            availablePrograms.map((program) => {
              const workoutNames = program.workouts.map((workout) => workout.name).join(" / ");
              const exerciseOverview =
                program.workouts
                  .map(
                    (workout) =>
                      `${workout.name}: ${workout.exercises
                        .map((exercise) => exercise.exerciseName)
                        .join(", ")}`
                  )
                  .join("\n") || "Workout overview unavailable";

              return (
                <View key={program.id} style={styles.programBlock}>
                  <Text style={styles.cardTitle}>{program.name}</Text>
                  <Text style={styles.cardBody}>{program.description}</Text>
                  <Text style={styles.metaLine}>
                    {program.daysPerWeek} days/week - {program.sessionDurationMinutes} minutes - {program.difficultyLevel}
                  </Text>
                  <Text style={styles.sectionTitle}>Weekly structure</Text>
                  <Text style={styles.cardBody}>{workoutNames}</Text>
                  <Text style={styles.sectionTitle}>Workout overview</Text>
                  <Text style={styles.cardBody}>{exerciseOverview}</Text>
                  <PrimaryButton
                    label="Start this program"
                    onPress={() => {
                      setLastAction("follow_program");
                      followProgramMutation.mutate(program.id);
                    }}
                    loading={followProgramMutation.isPending}
                  />
                </View>
              );
            })
          )}
          {programsQuery.isError ? (
            <Text style={styles.errorText}>We couldn't load programs. Pull to refresh or try again.</Text>
          ) : null}
        </View>
      ) : null}

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
            : activeProgram
              ? "Your program does not have a workout queued."
              : "Start a predefined program to queue your first workout."}
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
          disabled={Boolean(activeWorkout || !nextWorkout || !activeProgram)}
          loading={startWorkoutMutation.isPending}
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardLabel}>This week</Text>
        <Text style={styles.cardTitle}>{dashboard.weeklyWorkoutCount} workouts completed</Text>
        <Text style={styles.cardBody}>
          Recent activity: {dashboard.recentProgressMetrics[0]?.displayText ?? "No progress metrics yet."}
        </Text>
        <PrimaryButton
          label="View progress"
          tone="secondary"
          onPress={() => {
            setLastAction("view_progress");
            navigation.navigate("Progression");
          }}
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardLabel}>Recent workouts</Text>
        <Text style={styles.cardTitle}>
          {dashboard.recentWorkoutHistory[0]?.workoutName ?? "No completed workouts yet"}
        </Text>
        <Text style={styles.cardBody}>
          {dashboard.recentWorkoutHistory[0]
            ? `${dashboard.recentWorkoutHistory[0].programName} - ${dashboard.recentWorkoutHistory[0].completedSetCount} sets completed`
            : "Finish a workout to build your history."}
        </Text>
        <PrimaryButton
          label="View history"
          tone="secondary"
          onPress={() => {
            setLastAction("view_history");
            navigation.navigate("WorkoutHistory");
          }}
        />
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
  metaLine: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 20
  },
  programBlock: {
    gap: spacing.sm
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: "700"
  },
  errorText: {
    color: colors.accentStrong,
    fontSize: 14,
    fontWeight: "700"
  },
  actions: {
    gap: spacing.sm
  }
});
