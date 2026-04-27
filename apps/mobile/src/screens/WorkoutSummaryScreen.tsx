import { useState } from "react";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { ProgressMetricDto, ProgressionUpdateDto } from "@fitness/shared";
import { StyleSheet, Text, View } from "react-native";
import { Screen } from "../components/Screen";
import { PrimaryButton } from "../components/PrimaryButton";
import type { RootStackParamList } from "../core/navigation/navigation-types";
import { FeedbackButton } from "../features/feedback/components/FeedbackButton";
import {
  getWorkoutSummaryEncouragement,
  getWorkoutSummaryHeadline,
  getWorkoutSummaryOutcomes,
  getProgressionUpdateSummaryText
} from "../features/workout/utils/workout-summary.shared";
import { colors, spacing } from "../theme/tokens";

type Props = NativeStackScreenProps<RootStackParamList, "WorkoutSummary">;

export function WorkoutSummaryScreen({ navigation, route }: Props) {
  const { summary } = route.params;
  const [lastAction, setLastAction] = useState<string | null>("completed_workout");
  const headline = getWorkoutSummaryHeadline(summary);
  const encouragement = getWorkoutSummaryEncouragement(summary);
  const outcomes = getWorkoutSummaryOutcomes(summary);

  return (
    <Screen>
      <View style={styles.hero}>
        <Text style={styles.eyebrow}>Workout complete</Text>
        <Text style={styles.title}>{summary.workoutSession.workoutName}</Text>
        <Text style={styles.subtitle}>{headline}</Text>
      </View>

      <View style={styles.successCard}>
        <Text style={styles.successLabel}>Saved</Text>
        <Text style={styles.successTitle}>Strong work.</Text>
        <Text style={styles.successBody}>{encouragement}</Text>
        <View style={styles.statGrid}>
          {outcomes.map((outcome) => (
            <View key={outcome.label} style={styles.statBlock}>
              <Text style={styles.successLabel}>{outcome.label}</Text>
              <Text style={styles.statValue}>{outcome.value}</Text>
              <Text style={styles.statDetail}>{outcome.detail}</Text>
            </View>
          ))}
        </View>
        <Text style={styles.successBody}>
          Next workout: {summary.nextWorkoutTemplate?.name ?? "No next workout queued"}
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardLabel}>Progression updates</Text>
        {summary.progressionUpdates.length === 0 ? (
          <Text style={styles.rowBody}>No progression changes for this workout.</Text>
        ) : (
          summary.progressionUpdates.map((update: ProgressionUpdateDto) => (
            <View key={update.exerciseId} style={styles.row}>
              <Text style={styles.rowTitle}>{update.exerciseName}</Text>
              <Text style={styles.rowBody}>{getProgressionUpdateSummaryText(update)}</Text>
              <Text style={styles.rowBody}>{update.reason}</Text>
            </View>
          ))
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardLabel}>Recorded metrics</Text>
        {summary.progressMetrics.length === 0 ? (
          <Text style={styles.rowBody}>Workout completed.</Text>
        ) : (
          summary.progressMetrics.map((metric: ProgressMetricDto) => (
            <Text key={metric.id} style={styles.rowBody}>
              {metric.displayText}
            </Text>
          ))
        )}
      </View>

      <FeedbackButton
        screenName="WorkoutSummaryScreen"
        workoutSessionId={summary.workoutSession.id}
        lastAction={lastAction}
      />

      <PrimaryButton
        label="View workout detail"
        tone="secondary"
        onPress={() => {
          setLastAction("view_completed_workout_detail");
          navigation.navigate("WorkoutHistoryDetail", { sessionId: summary.workoutSession.id });
        }}
      />

      <PrimaryButton
        label="Back to dashboard"
        onPress={() => {
          setLastAction("return_to_dashboard");
          navigation.reset({ index: 0, routes: [{ name: "Dashboard" }] });
        }}
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
    textTransform: "uppercase"
  },
  title: {
    color: colors.textPrimary,
    fontSize: 30,
    fontWeight: "800"
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 16
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 22,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.lg
  },
  successCard: {
    backgroundColor: colors.textPrimary,
    borderRadius: 22,
    gap: spacing.md,
    padding: spacing.lg
  },
  successTitle: {
    color: colors.surface,
    fontSize: 22,
    fontWeight: "800"
  },
  successBody: {
    color: colors.surfaceMuted,
    fontSize: 15,
    lineHeight: 21
  },
  successLabel: {
    color: colors.surfaceMuted,
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase"
  },
  statGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  statBlock: {
    backgroundColor: "rgba(255, 250, 242, 0.12)",
    borderRadius: 16,
    flexGrow: 1,
    gap: spacing.xs,
    minWidth: 120,
    padding: spacing.md
  },
  statValue: {
    color: colors.surface,
    fontSize: 22,
    fontWeight: "800"
  },
  statDetail: {
    color: colors.surfaceMuted,
    fontSize: 13,
    fontWeight: "700"
  },
  cardLabel: {
    color: colors.accentStrong,
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase"
  },
  row: {
    gap: 4
  },
  rowTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: "700"
  },
  rowBody: {
    color: colors.textSecondary,
    fontSize: 15,
    lineHeight: 21
  }
});
