import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { ErrorState } from "../components/ErrorState";
import { LoadingState } from "../components/LoadingState";
import { PrimaryButton } from "../components/PrimaryButton";
import { Screen } from "../components/Screen";
import type { RootStackParamList } from "../core/navigation/navigation-types";
import { useWorkoutHistory } from "../features/workout/hooks/useWorkoutHistory";
import { colors, spacing } from "../theme/tokens";

type Props = NativeStackScreenProps<RootStackParamList, "WorkoutHistory">;

function formatCompletedDate(value: string | null) {
  if (!value) {
    return "Date unavailable";
  }

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
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

export function WorkoutHistoryScreen({ navigation }: Props) {
  const historyQuery = useWorkoutHistory(50);

  if (historyQuery.isLoading) {
    return (
      <Screen>
        <LoadingState label="Loading workout history..." />
      </Screen>
    );
  }

  if (historyQuery.isError || !historyQuery.data) {
    return (
      <Screen>
        <ErrorState
          title="History unavailable"
          message="We couldn't load your completed workouts."
          actionLabel="Try again"
          onAction={() => void historyQuery.refetch()}
        />
      </Screen>
    );
  }

  const items = historyQuery.data.items;

  return (
    <Screen>
      <View style={styles.hero}>
        <Text style={styles.eyebrow}>History</Text>
        <Text style={styles.title}>Past workouts</Text>
        <Text style={styles.subtitle}>Completed sessions from your saved workout history.</Text>
      </View>

      {items.length === 0 ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>No completed workouts yet</Text>
          <Text style={styles.cardBody}>Finish a workout and it will show up here.</Text>
        </View>
      ) : (
        items.map((item) => (
          <Pressable
            key={item.id}
            accessibilityRole="button"
            onPress={() => navigation.navigate("WorkoutHistoryDetail", { sessionId: item.id })}
            style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
          >
            <Text style={styles.cardLabel}>{formatCompletedDate(item.completedAt)}</Text>
            <Text style={styles.cardTitle}>{item.workoutName}</Text>
            <Text style={styles.cardBody}>{item.programName}</Text>
            <Text style={styles.metaLine}>
              {formatDuration(item.durationSeconds)} - {item.exerciseCount} exercises - {item.completedSetCount}/
              {item.plannedSetCount} sets
            </Text>
            {item.isPartial ? <Text style={styles.warningText}>Finished early</Text> : null}
            {item.failedSetCount > 0 ? (
              <Text style={styles.warningText}>{item.failedSetCount} failed sets</Text>
            ) : null}
            {item.highlights.length > 0 ? (
              <View style={styles.highlightList}>
                {item.highlights.slice(0, 3).map((highlight) => (
                  <Text key={highlight} style={styles.highlightPill}>
                    {highlight}
                  </Text>
                ))}
              </View>
            ) : null}
            <Text style={styles.detailHint}>View details</Text>
          </Pressable>
        ))
      )}

      <PrimaryButton
        label="Refresh history"
        tone="secondary"
        onPress={() => void historyQuery.refetch()}
        loading={historyQuery.isFetching}
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
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 22,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.lg
  },
  cardPressed: {
    opacity: 0.72
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
    fontSize: 16,
    lineHeight: 22
  },
  metaLine: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 20
  },
  warningText: {
    color: colors.accentStrong,
    fontSize: 14,
    fontWeight: "700"
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
    fontWeight: "800",
    overflow: "hidden",
    paddingHorizontal: spacing.sm,
    paddingVertical: 6
  },
  detailHint: {
    color: colors.accentStrong,
    fontSize: 14,
    fontWeight: "800"
  }
});
