import { useState } from "react";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { ProgressMetricDto, ProgressionUpdateDto } from "@fitness/shared";
import { StyleSheet, Text, View } from "react-native";
import { Screen } from "../components/Screen";
import { PrimaryButton } from "../components/PrimaryButton";
import type { RootStackParamList } from "../core/navigation/navigation-types";
import { FeedbackButton } from "../features/feedback/components/FeedbackButton";
import { useTrainingSettings } from "../features/workout/hooks/useTrainingSettings";
import {
  getWorkoutSummaryEncouragement,
  getWorkoutSummaryHeadline,
  getWorkoutSummaryOutcomes,
  getProgressionUpdateConfidenceLabel,
  getProgressionUpdateEvidence,
  getProgressionUpdateReasonText,
  getProgressionUpdateRepGoalChangeText,
  getProgressionUpdateResultLabel,
  getProgressionUpdateWeightChangeText
} from "../features/workout/utils/workout-summary.shared";
import { colors, spacing } from "../theme/tokens";

type Props = NativeStackScreenProps<RootStackParamList, "WorkoutSummary">;

export function WorkoutSummaryScreen({ navigation, route }: Props) {
  const { summary } = route.params;
  const trainingSettingsQuery = useTrainingSettings();
  const unitSystem = trainingSettingsQuery.data?.unitSystem ?? "imperial";
  const [lastAction, setLastAction] = useState<string | null>("completed_workout");
  const headline = getWorkoutSummaryHeadline(summary);
  const encouragement = getWorkoutSummaryEncouragement(summary, unitSystem);
  const outcomes = getWorkoutSummaryOutcomes(summary, unitSystem);

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
            <View key={`${update.exerciseId}:${update.result}`} style={styles.progressionRow}>
              <View style={styles.progressionRowHeader}>
                <Text style={styles.rowTitle}>{update.exerciseName}</Text>
                <View style={styles.badgeRow}>
                  <View
                    style={[
                      styles.progressionBadge,
                      update.result === "skipped" ? styles.progressionBadgeSkipped : styles.progressionBadgeDefault
                    ]}
                  >
                    <Text
                      style={[
                        styles.progressionBadgeText,
                        update.result === "skipped"
                          ? styles.progressionBadgeTextSkipped
                          : styles.progressionBadgeTextDefault
                      ]}
                    >
                      {getProgressionUpdateResultLabel(update.result)}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.confidenceBadge,
                      update.confidence === "high"
                        ? styles.confidenceBadgeHigh
                        : update.confidence === "low"
                          ? styles.confidenceBadgeLow
                          : styles.confidenceBadgeMedium
                    ]}
                  >
                    <Text
                      style={[
                        styles.confidenceBadgeText,
                        (update.confidence === "high" || update.confidence === "low") && styles.confidenceBadgeTextOnStrong
                      ]}
                    >
                      {getProgressionUpdateConfidenceLabel(update.confidence)}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.progressionDetails}>
                  <Text style={styles.rowBody}>
                  <Text style={styles.progressionDetailLabel}>Weight: </Text>
                  {getProgressionUpdateWeightChangeText(update, unitSystem)}
                </Text>
                {getProgressionUpdateRepGoalChangeText(update) ? (
                  <Text style={styles.rowBody}>
                    <Text style={styles.progressionDetailLabel}>Rep goal: </Text>
                    {getProgressionUpdateRepGoalChangeText(update)}
                  </Text>
                ) : null}
              </View>

              <Text style={styles.progressionReason}>{getProgressionUpdateReasonText(update)}</Text>
              {getProgressionUpdateEvidence(update).length > 0 ? (
                <View style={styles.evidenceList}>
                  {getProgressionUpdateEvidence(update).slice(0, 4).map((item, index) => (
                    <Text key={`${update.exerciseId}:evidence:${index}`} style={styles.evidenceItem}>
                      {"\u2022"} {item}
                    </Text>
                  ))}
                </View>
              ) : null}
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
    fontWeight: "600",
    textTransform: "uppercase"
  },
  title: {
    color: colors.textPrimary,
    fontSize: 30,
    fontWeight: "600"
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 16
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.lg
  },
  successCard: {
    backgroundColor: colors.textPrimary,
    borderRadius: 12,
    gap: spacing.md,
    padding: spacing.lg
  },
  successTitle: {
    color: colors.surface,
    fontSize: 22,
    fontWeight: "600"
  },
  successBody: {
    color: colors.surfaceMuted,
    fontSize: 15,
    lineHeight: 21
  },
  successLabel: {
    color: colors.surfaceMuted,
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase"
  },
  statGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  statBlock: {
    backgroundColor: "rgba(255, 255, 255, 0.10)",
    borderRadius: 12,
    flexGrow: 1,
    gap: spacing.xs,
    minWidth: 120,
    padding: spacing.md
  },
  statValue: {
    color: colors.surface,
    fontSize: 22,
    fontWeight: "600"
  },
  statDetail: {
    color: colors.surfaceMuted,
    fontSize: 13,
    fontWeight: "600"
  },
  cardLabel: {
    color: colors.accentStrong,
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase"
  },
  rowTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: "600"
  },
  badgeRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    justifyContent: "flex-end"
  },
  rowBody: {
    color: colors.textSecondary,
    fontSize: 15,
    lineHeight: 21
  },
  progressionRow: {
    gap: 6,
    paddingTop: spacing.xs
  },
  progressionRowHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  progressionBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4
  },
  progressionBadgeDefault: {
    backgroundColor: colors.textPrimary
  },
  progressionBadgeSkipped: {
    backgroundColor: colors.surfaceMuted
  },
  progressionBadgeText: {
    fontSize: 12,
    fontWeight: "600"
  },
  progressionBadgeTextDefault: {
    color: colors.surface
  },
  confidenceBadge: {
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5
  },
  confidenceBadgeHigh: {
    backgroundColor: colors.success
  },
  confidenceBadgeMedium: {
    backgroundColor: colors.surfaceMuted
  },
  confidenceBadgeLow: {
    backgroundColor: colors.danger
  },
  confidenceBadgeText: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: "600"
  },
  confidenceBadgeTextOnStrong: {
    color: colors.surface
  },
  evidenceList: {
    gap: 4
  },
  evidenceItem: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18
  },
  progressionBadgeTextSkipped: {
    color: colors.textPrimary
  },
  progressionDetails: {
    gap: 2
  },
  progressionDetailLabel: {
    color: colors.textPrimary,
    fontWeight: "600"
  },
  progressionReason: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20
  }
});
