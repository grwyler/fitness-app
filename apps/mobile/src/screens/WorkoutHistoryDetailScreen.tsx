import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { formatWeightForUser } from "@fitness/shared";
import { StyleSheet, Text, View } from "react-native";
import { ErrorState } from "../components/ErrorState";
import { LoadingState } from "../components/LoadingState";
import { Screen } from "../components/Screen";
import type { RootStackParamList } from "../core/navigation/navigation-types";
import { useProgression } from "../features/workout/hooks/useProgression";
import { useTrainingSettings } from "../features/workout/hooks/useTrainingSettings";
import { useWorkoutHistoryDetail } from "../features/workout/hooks/useWorkoutHistoryDetail";
import {
  buildWorkoutDetailProgressHighlights,
  getCompletedSetVolume,
  getWorkoutDetailStats
} from "../features/workout/utils/history-detail.shared";
import { colors, spacing } from "../theme/tokens";

type Props = NativeStackScreenProps<RootStackParamList, "WorkoutHistoryDetail">;

function formatCompletedDate(value: string | null) {
  if (!value) {
    return "Completion time unavailable";
  }

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

function formatDuration(durationSeconds: number | null) {
  if (!durationSeconds) {
    return "Duration unavailable";
  }

  const minutes = Math.max(1, Math.round(durationSeconds / 60));
  return `${minutes} min`;
}

function formatSetStatus(status: string) {
  if (status === "completed") {
    return "Done";
  }

  if (status === "failed") {
    return "Missed";
  }

  if (status === "skipped") {
    return "Skipped";
  }

  return "Not logged";
}

export function WorkoutHistoryDetailScreen({ route, navigation }: Props) {
  const detailQuery = useWorkoutHistoryDetail(route.params.sessionId);
  const progressionQuery = useProgression();
  const trainingSettingsQuery = useTrainingSettings();
  const unitSystem = trainingSettingsQuery.data?.unitSystem ?? "imperial";

  if (detailQuery.isLoading) {
    return (
      <Screen>
        <LoadingState label="Loading workout detail..." />
      </Screen>
    );
  }

  if (detailQuery.isError || !detailQuery.data) {
    return (
      <Screen>
        <ErrorState
          title="Workout unavailable"
          message="We couldn't load this completed workout."
          actionLabel="Back to history"
          onAction={() => navigation.goBack()}
        />
      </Screen>
    );
  }

  const workout = detailQuery.data;
  const progressHighlights = buildWorkoutDetailProgressHighlights({
    workout,
    progression: progressionQuery.data,
    unitSystem
  });
  const progressHighlightsByEntryId = progressHighlights.reduce<Record<string, string>>((accumulator, item) => {
    accumulator[item.exerciseEntryId] = item.text;
    return accumulator;
  }, {});
  const stats = getWorkoutDetailStats(workout);

  return (
    <Screen>
      <View style={styles.hero}>
        <Text style={styles.eyebrow}>Workout detail</Text>
        <Text style={styles.title}>{workout.workoutName}</Text>
        <Text style={styles.subtitle}>{workout.programName}</Text>
      </View>

      <View style={styles.summaryCard}>
        <Text style={styles.cardLabel}>Completed</Text>
        <Text style={styles.cardTitle}>{formatCompletedDate(workout.completedAt)}</Text>
        <Text style={styles.cardBody}>
          {formatDuration(workout.durationSeconds)} - {workout.exercises.length} exercises -{" "}
          {stats.completedSetCount}/{stats.plannedSetCount} sets
        </Text>
        {workout.isPartial ? <Text style={styles.warningText}>Finished early</Text> : null}
        {stats.failedSetCount > 0 ? (
          <Text style={styles.warningText}>{stats.failedSetCount} missed sets</Text>
        ) : null}
        <View style={styles.summaryGrid}>
          <View style={styles.summaryStat}>
            <Text style={styles.cardLabel}>Volume</Text>
            <Text style={styles.summaryValue}>
              {formatWeightForUser({
                weightLbs: stats.totalVolume,
                unitSystem,
                maximumFractionDigits: 0,
                useGrouping: true
              }).text}
            </Text>
          </View>
          <View style={styles.summaryStat}>
            <Text style={styles.cardLabel}>Outcome</Text>
            <Text style={styles.summaryValue}>
              {progressHighlights.length > 0 ? `${progressHighlights.length} improved` : "Saved"}
            </Text>
          </View>
        </View>
        {progressHighlights.length > 0 ? (
          <View style={styles.highlightList}>
            {progressHighlights.slice(0, 4).map((highlight) => (
              <Text key={highlight.exerciseEntryId} style={styles.highlightPill}>
                {highlight.text}
              </Text>
            ))}
          </View>
        ) : null}
      </View>

      {workout.exercises.map((exercise) => {
        const highlight = progressHighlightsByEntryId[exercise.id];
        const exerciseVolume = exercise.sets.reduce((sum, set) => sum + getCompletedSetVolume(set), 0);

        return (
          <View key={exercise.id} style={styles.exerciseCard}>
            <View style={styles.exerciseHeader}>
              <View style={styles.exerciseTitleRow}>
                <Text style={styles.exerciseTitle}>{exercise.exerciseName}</Text>
                {highlight ? <Text style={styles.exerciseHighlight}>{highlight}</Text> : null}
              </View>
              <Text style={styles.exerciseMeta}>
                {exercise.targetSets} x {exercise.targetReps} at{" "}
                {formatWeightForUser({ weightLbs: exercise.targetWeight.value, unitSystem }).text}
              </Text>
              <Text style={styles.exerciseMeta}>
                {formatWeightForUser({
                  weightLbs: exerciseVolume,
                  unitSystem,
                  maximumFractionDigits: 0,
                  useGrouping: true
                }).text}{" "}
                volume
              </Text>
            </View>

            {exercise.sets.map((set) => (
              <View key={set.id} style={styles.setRow}>
                <Text style={styles.setTitle}>Set {set.setNumber}</Text>
                <Text style={styles.setMeta}>
                  {set.status === "pending"
                    ? `Not logged - planned ${set.targetReps} reps at ${formatWeightForUser({
                        weightLbs: set.targetWeight.value,
                        unitSystem
                      }).text}`
                    : `${set.actualReps ?? 0} reps at ${formatWeightForUser({
                        weightLbs: set.actualWeight?.value ?? set.targetWeight.value,
                        unitSystem
                      }).text}`}
                </Text>
                <Text
                  style={[
                    styles.setStatus,
                    set.status === "completed" && styles.setStatusComplete,
                    set.status === "failed" && styles.setStatusFailed
                  ]}
                >
                  {formatSetStatus(set.status)}
                </Text>
              </View>
            ))}

            <Text style={styles.feedbackText}>
              Feedback: {exercise.effortFeedback ? exercise.effortFeedback.replace("_", " ") : "Not recorded"}
            </Text>
          </View>
        );
      })}
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
    fontWeight: "600",
    textTransform: "uppercase"
  },
  title: {
    color: colors.textPrimary,
    fontSize: 30,
    fontWeight: "600",
    lineHeight: 36
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 16,
    lineHeight: 22
  },
  summaryCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.lg
  },
  cardLabel: {
    color: colors.accentStrong,
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase"
  },
  cardTitle: {
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: "600"
  },
  cardBody: {
    color: colors.textSecondary,
    fontSize: 16,
    lineHeight: 22
  },
  warningText: {
    color: colors.accentStrong,
    fontSize: 14,
    fontWeight: "600"
  },
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  summaryStat: {
    backgroundColor: colors.background,
    borderRadius: 12,
    flexGrow: 1,
    gap: spacing.xs,
    minWidth: 120,
    padding: spacing.md
  },
  summaryValue: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: "600"
  },
  highlightList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs
  },
  highlightPill: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 999,
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: "600",
    overflow: "hidden",
    paddingHorizontal: spacing.sm,
    paddingVertical: 6
  },
  exerciseCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.lg
  },
  exerciseHeader: {
    gap: spacing.xs
  },
  exerciseTitleRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    justifyContent: "space-between"
  },
  exerciseTitle: {
    color: colors.textPrimary,
    flex: 1,
    fontSize: 22,
    fontWeight: "600",
    minWidth: 150
  },
  exerciseHighlight: {
    backgroundColor: colors.success,
    borderRadius: 999,
    color: colors.surface,
    flexShrink: 1,
    fontSize: 12,
    fontWeight: "600",
    overflow: "hidden",
    paddingHorizontal: spacing.sm,
    paddingVertical: 6
  },
  exerciseMeta: {
    color: colors.textSecondary,
    fontSize: 15,
    fontWeight: "600"
  },
  setRow: {
    alignItems: "center",
    backgroundColor: colors.background,
    borderRadius: 12,
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.md
  },
  setTitle: {
    color: colors.textPrimary,
    flexBasis: 56,
    flexShrink: 0,
    fontSize: 15,
    fontWeight: "600"
  },
  setMeta: {
    color: colors.textSecondary,
    flex: 1,
    fontSize: 15,
    fontWeight: "600"
  },
  setStatus: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 999,
    color: colors.textSecondary,
    flexShrink: 0,
    fontSize: 12,
    fontWeight: "600",
    overflow: "hidden",
    paddingHorizontal: spacing.sm,
    paddingVertical: 5
  },
  setStatusComplete: {
    backgroundColor: colors.success,
    color: colors.surface
  },
  setStatusFailed: {
    backgroundColor: colors.danger,
    color: colors.surface
  },
  feedbackText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: "600",
    textTransform: "capitalize"
  }
});
