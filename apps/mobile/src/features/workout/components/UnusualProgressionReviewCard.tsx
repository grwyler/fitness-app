import type { ProgressionRecommendationResolutionType } from "@fitness/shared";
import type { UnusualProgressionReviewItem } from "../utils/workout-summary.shared";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { PrimaryButton } from "../../../components/PrimaryButton";
import { colors, spacing } from "../../../theme/tokens";

type Props = {
  items: UnusualProgressionReviewItem[];
  onReviewWorkoutDetail?: () => void;
  onResolveRecommendation?: (input: { eventId: string; resolutionType: ProgressionRecommendationResolutionType }) => void;
  resolvingEventIds?: Record<string, boolean>;
};

function getResolutionLabel(type: ProgressionRecommendationResolutionType) {
  switch (type) {
    case "accepted":
      return "Accepted";
    case "smaller_increase":
      return "Using smaller increase";
    case "keep_current":
      return "Kept current target";
    case "retest_next_time":
      return "Marked for retest";
    case "ignored_bad_data":
      return "Ignored bad data";
    case "set_corrected":
      return "Sets corrected";
    case "unresolved":
      return null;
    default: {
      const exhaustiveCheck: never = type;
      return exhaustiveCheck;
    }
  }
}

export function UnusualProgressionReviewCard({
  items,
  onReviewWorkoutDetail,
  onResolveRecommendation,
  resolvingEventIds
}: Props) {
  if (items.length === 0) {
    return null;
  }

  const [expandedMoreOptions, setExpandedMoreOptions] = useState<Record<string, boolean>>({});

  return (
    <View style={styles.card}>
      <Text style={styles.cardLabel}>Review recommendation</Text>
      <Text style={styles.title}>Unusual performance detected</Text>
      <Text style={styles.body}>
        We noticed a large mismatch between prescribed targets and what was logged. This helps keep progression safe and trustworthy.
      </Text>

      {items.slice(0, 3).map((item) => (
        <View key={item.recommendationEventId ?? item.exerciseId} style={styles.item}>
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

          {item.resolutionType !== "unresolved" ? (
            <View style={styles.resolvedBadge}>
              <Text style={styles.resolvedBadgeText}>{getResolutionLabel(item.resolutionType)}</Text>
            </View>
          ) : item.recommendationEventId && item.recommendationEventId.length > 0 ? (
            <View style={styles.actionBlock}>
              <View style={styles.actionRow}>
                <PrimaryButton
                  label="Accept recommendation"
                  size="sm"
                  onPress={() =>
                    onResolveRecommendation?.({ eventId: item.recommendationEventId!, resolutionType: "accepted" })
                  }
                  loading={Boolean(resolvingEventIds?.[item.recommendationEventId!])}
                  disabled={!onResolveRecommendation}
                />
              </View>
              <View style={styles.actionRow}>
                <PrimaryButton
                  label="Use smaller increase"
                  tone="secondary"
                  size="sm"
                  onPress={() =>
                    onResolveRecommendation?.({
                      eventId: item.recommendationEventId!,
                      resolutionType: "smaller_increase"
                    })
                  }
                  loading={Boolean(resolvingEventIds?.[item.recommendationEventId!])}
                  disabled={!onResolveRecommendation}
                />
                <PrimaryButton
                  label="Keep current target"
                  variant="ghost"
                  size="sm"
                  onPress={() =>
                    onResolveRecommendation?.({ eventId: item.recommendationEventId!, resolutionType: "keep_current" })
                  }
                  loading={Boolean(resolvingEventIds?.[item.recommendationEventId!])}
                  disabled={!onResolveRecommendation}
                />
              </View>

              <View style={styles.actionRow}>
                {onReviewWorkoutDetail ? (
                  <PrimaryButton
                    label="Edit sets"
                    tone="secondary"
                    size="sm"
                    onPress={onReviewWorkoutDetail}
                  />
                ) : null}
                <PrimaryButton
                  label="More options"
                  variant="ghost"
                  size="sm"
                  onPress={() =>
                    setExpandedMoreOptions((current) => ({
                      ...current,
                      [item.recommendationEventId!]: !current[item.recommendationEventId!]
                    }))
                  }
                />
              </View>

              {expandedMoreOptions[item.recommendationEventId] ? (
                <View style={styles.moreOptions}>
                  <PrimaryButton
                    label="Retest next time"
                    variant="ghost"
                    size="sm"
                    onPress={() =>
                      onResolveRecommendation?.({
                        eventId: item.recommendationEventId!,
                        resolutionType: "retest_next_time"
                      })
                    }
                    loading={Boolean(resolvingEventIds?.[item.recommendationEventId!])}
                    disabled={!onResolveRecommendation}
                  />
                </View>
              ) : null}
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
  },
  actionBlock: {
    gap: spacing.xs,
    paddingTop: spacing.xs
  },
  actionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs
  },
  resolvedBadge: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(234, 179, 8, 0.15)",
    borderColor: colors.warning,
    borderRadius: 999,
    borderWidth: 1,
    marginTop: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6
  },
  resolvedBadgeText: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: "700"
  },
  moreOptions: {
    gap: spacing.xs
  }
});

