import { StyleSheet, Text, View } from "react-native";
import { ErrorState } from "../components/ErrorState";
import { LoadingState } from "../components/LoadingState";
import { PrimaryButton } from "../components/PrimaryButton";
import { Screen } from "../components/Screen";
import { useProgression } from "../features/workout/hooks/useProgression";
import {
  formatProgressionVolume,
  formatProgressionWeight,
  getProgressionEmptyState
} from "../features/workout/utils/progression-screen.shared";
import { colors, spacing } from "../theme/tokens";

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric"
  }).format(new Date(value));
}

export function ProgressionScreen() {
  const progressionQuery = useProgression();

  if (progressionQuery.isLoading) {
    return (
      <Screen>
        <LoadingState label="Loading progression..." />
      </Screen>
    );
  }

  if (progressionQuery.isError || !progressionQuery.data) {
    return (
      <Screen>
        <ErrorState
          title="Progression unavailable"
          message="We couldn't load your progress yet."
          actionLabel="Try again"
          onAction={() => void progressionQuery.refetch()}
        />
      </Screen>
    );
  }

  const progression = progressionQuery.data;
  const isEmpty = getProgressionEmptyState(progression);

  return (
    <Screen>
      <View style={styles.hero}>
        <Text style={styles.eyebrow}>Progress</Text>
        <Text style={styles.title}>Basic progression</Text>
        <Text style={styles.subtitle}>Simple trends from completed workouts.</Text>
      </View>

      {isEmpty ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>No completed workouts yet</Text>
          <Text style={styles.cardBody}>Finish a workout and your progress will show up here.</Text>
        </View>
      ) : (
        <>
          <View style={styles.grid}>
            <View style={styles.statCard}>
              <Text style={styles.cardLabel}>Completed</Text>
              <Text style={styles.statValue}>{progression.totalCompletedWorkouts}</Text>
              <Text style={styles.cardBody}>total workouts</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.cardLabel}>This week</Text>
              <Text style={styles.statValue}>{progression.workoutsCompletedThisWeek}</Text>
              <Text style={styles.cardBody}>workouts</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.cardLabel}>Streak</Text>
              <Text style={styles.statValue}>{progression.currentStreakDays}</Text>
              <Text style={styles.cardBody}>days</Text>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardLabel}>Recent volume</Text>
            <Text style={styles.cardTitle}>Workout volume over time</Text>
            {progression.recentWorkoutVolume.length === 0 ? (
              <Text style={styles.cardBody}>No logged set volume yet.</Text>
            ) : (
              progression.recentWorkoutVolume.map((point) => (
                <View key={point.workoutSessionId} style={styles.row}>
                  <View style={styles.rowText}>
                    <Text style={styles.rowTitle}>{point.workoutName}</Text>
                    <Text style={styles.cardBody}>{formatDate(point.completedAt)}</Text>
                  </View>
                  <Text style={styles.valueText}>{formatProgressionVolume(point.totalVolume.value)}</Text>
                </View>
              ))
            )}
          </View>

          <View style={styles.card}>
            <Text style={styles.cardLabel}>Exercises</Text>
            <Text style={styles.cardTitle}>Recent bests</Text>
            {progression.exercises.length === 0 ? (
              <Text style={styles.cardBody}>No exercise progression is available yet.</Text>
            ) : (
              progression.exercises.map((exercise) => (
                <View key={exercise.exerciseId} style={styles.exerciseBlock}>
                  <View style={styles.row}>
                    <View style={styles.rowText}>
                      <Text style={styles.rowTitle}>{exercise.exerciseName}</Text>
                      <Text style={styles.cardBody}>
                        {exercise.completedWorkoutCount} completed workouts
                      </Text>
                    </View>
                    <Text style={styles.valueText}>
                      {formatProgressionWeight(exercise.recentBestWeight?.value)}
                    </Text>
                  </View>
                  <Text style={styles.metaLine}>
                    Best reps: {exercise.recentBestReps ?? "none"} - Last:{" "}
                    {exercise.lastPerformedAt ? formatDate(exercise.lastPerformedAt) : "none"}
                  </Text>
                </View>
              ))
            )}
          </View>
        </>
      )}

      <PrimaryButton
        label="Refresh progress"
        tone="secondary"
        onPress={() => void progressionQuery.refetch()}
        loading={progressionQuery.isFetching}
      />
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
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  statCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 18,
    borderWidth: 1,
    flexGrow: 1,
    gap: spacing.xs,
    minWidth: 104,
    padding: spacing.md
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
    fontSize: 22,
    fontWeight: "700"
  },
  cardBody: {
    color: colors.textSecondary,
    fontSize: 15,
    lineHeight: 21
  },
  statValue: {
    color: colors.textPrimary,
    fontSize: 28,
    fontWeight: "800"
  },
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between"
  },
  rowText: {
    flex: 1,
    gap: spacing.xs
  },
  rowTitle: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: "700"
  },
  valueText: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "800"
  },
  metaLine: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 20
  },
  exerciseBlock: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    gap: spacing.xs,
    paddingTop: spacing.sm
  }
});
