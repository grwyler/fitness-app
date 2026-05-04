import type { UnusualProgressionReviewItem } from "../utils/workout-summary.shared";
import { StyleSheet, Text, View } from "react-native";
import { PrimaryButton } from "../../../components/PrimaryButton";
import { colors, spacing } from "../../../theme/tokens";

type Props = {
  items: UnusualProgressionReviewItem[];
  onReviewWorkoutDetail?: () => void;
};

export function UnusualProgressionReviewCard({ items, onReviewWorkoutDetail }: Props) {
  if (items.length === 0) {
    return null;
  }

  return (
    <View style={styles.card}>
      <Text style={styles.cardLabel}>Review recommendation</Text>
      <Text style={styles.title}>Unusual performance detected</Text>
      <Text style={styles.body}>
        We noticed a large mismatch between prescribed targets and what was logged. This helps keep progression safe and trustworthy.
      </Text>

      {items.slice(0, 3).map((item) => (
        <View key={item.exerciseId} style={styles.item}>
          <Text style={styles.itemTitle}>{item.exerciseName}</Text>
          <Text style={styles.itemBody}>{item.message}</Text>
          {item.evidence.length > 0 ? (
            <View style={styles.evidenceList}>
              {item.evidence.slice(0, 4).map((line, index) => (
                <Text key={`${item.exerciseId}:evidence:${index}`} style={styles.evidenceItem}>
                  {"\u2022"} {line}
                </Text>
              ))}
            </View>
          ) : null}
        </View>
      ))}

      {onReviewWorkoutDetail ? (
        <PrimaryButton label="Review sets" tone="secondary" onPress={onReviewWorkoutDetail} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.accentMuted,
    borderColor: colors.warning,
    borderRadius: 12,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.lg
  },
  cardLabel: {
    color: colors.warning,
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase"
  },
  title: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: "700"
  },
  body: {
    color: colors.textSecondary,
    fontSize: 15,
    lineHeight: 21
  },
  item: {
    gap: spacing.xs,
    paddingTop: spacing.xs
  },
  itemTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "700"
  },
  itemBody: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20
  },
  evidenceList: {
    gap: 4
  },
  evidenceItem: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18
  }
});

