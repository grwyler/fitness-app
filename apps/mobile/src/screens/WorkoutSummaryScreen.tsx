import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { ProgressMetricDto, ProgressionUpdateDto } from "@fitness/shared";
import { StyleSheet, Text, View } from "react-native";
import { Screen } from "../components/Screen";
import { PrimaryButton } from "../components/PrimaryButton";
import type { RootStackParamList } from "../app/navigation/navigation-types";
import { colors, spacing } from "../theme/tokens";

type Props = NativeStackScreenProps<RootStackParamList, "WorkoutSummary">;

export function WorkoutSummaryScreen({ navigation, route }: Props) {
  const { summary } = route.params;

  return (
    <Screen>
      <View style={styles.hero}>
        <Text style={styles.eyebrow}>Workout complete</Text>
        <Text style={styles.title}>{summary.workoutSession.workoutName}</Text>
        <Text style={styles.subtitle}>
          Next workout: {summary.nextWorkoutTemplate?.name ?? "No next workout queued"}
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardLabel}>Progression updates</Text>
        {summary.progressionUpdates.map((update: ProgressionUpdateDto) => (
          <View key={update.exerciseId} style={styles.row}>
            <Text style={styles.rowTitle}>{update.exerciseName}</Text>
            <Text style={styles.rowBody}>
              {update.previousWeight.value} lb → {update.nextWeight.value} lb
            </Text>
            <Text style={styles.rowBody}>{update.reason}</Text>
          </View>
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardLabel}>Recorded metrics</Text>
        {summary.progressMetrics.map((metric: ProgressMetricDto) => (
          <Text key={metric.id} style={styles.rowBody}>
            {metric.displayText}
          </Text>
        ))}
      </View>

      <PrimaryButton
        label="Back to dashboard"
        onPress={() => navigation.reset({ index: 0, routes: [{ name: "Dashboard" }] })}
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
