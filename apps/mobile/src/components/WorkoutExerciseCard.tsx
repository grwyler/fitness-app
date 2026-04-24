import type { EffortFeedback, ExerciseEntryDto, SetDto } from "@fitness/shared";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, spacing } from "../theme/tokens";
import { PrimaryButton } from "./PrimaryButton";

const effortOptions: EffortFeedback[] = ["too_easy", "just_right", "too_hard"];

function formatFeedbackLabel(feedback: EffortFeedback) {
  switch (feedback) {
    case "too_easy":
      return "Too easy";
    case "just_right":
      return "Just right";
    case "too_hard":
      return "Too hard";
  }
}

function renderSetStatusLabel(set: SetDto) {
  if (set.status === "completed") {
    return "Completed";
  }

  if (set.status === "failed") {
    return "Failed";
  }

  return "Pending";
}

export function WorkoutExerciseCard(props: {
  exercise: ExerciseEntryDto;
  selectedFeedback?: EffortFeedback;
  loggingSetId?: string | null;
  onCompleteSet: (set: SetDto) => void;
  onFailSet: (set: SetDto) => void;
  onSelectFeedback: (feedback: EffortFeedback) => void;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>{props.exercise.exerciseName}</Text>
        <Text style={styles.subtitle}>
          {props.exercise.targetSets} x {props.exercise.targetReps} at {props.exercise.targetWeight.value} lb
        </Text>
        <Text style={styles.helper}>Rest {props.exercise.restSeconds ?? 0}s between sets</Text>
      </View>

      <View style={styles.setList}>
        {props.exercise.sets.map((set) => {
          const isPending = set.status === "pending";
          const isLogging = props.loggingSetId === set.id;

          return (
            <View key={set.id} style={styles.setRow}>
              <View style={styles.setInfo}>
                <Text style={styles.setTitle}>Set {set.setNumber}</Text>
                <Text style={styles.setMeta}>
                  {set.targetReps} reps at {set.targetWeight.value} lb
                </Text>
                <Text style={styles.setMeta}>{renderSetStatusLabel(set)}</Text>
              </View>

              {isPending ? (
                <View style={styles.setActions}>
                  <PrimaryButton
                    label="Complete"
                    onPress={() => props.onCompleteSet(set)}
                    loading={isLogging}
                  />
                  <PrimaryButton
                    label="Fail"
                    onPress={() => props.onFailSet(set)}
                    loading={isLogging}
                    tone="danger"
                  />
                </View>
              ) : null}
            </View>
          );
        })}
      </View>

      <View style={styles.feedbackSection}>
        <Text style={styles.feedbackTitle}>How did this exercise feel?</Text>
        <View style={styles.feedbackOptions}>
          {effortOptions.map((option) => {
            const selected = props.selectedFeedback === option;

            return (
              <Pressable
                key={option}
                onPress={() => props.onSelectFeedback(option)}
                style={[styles.feedbackChip, selected && styles.feedbackChipSelected]}
              >
                <Text style={[styles.feedbackChipLabel, selected && styles.feedbackChipLabelSelected]}>
                  {formatFeedbackLabel(option)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 22,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.lg
  },
  header: {
    gap: spacing.xs
  },
  title: {
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: "700"
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 16
  },
  helper: {
    color: colors.textSecondary,
    fontSize: 14
  },
  setList: {
    gap: spacing.sm
  },
  setRow: {
    backgroundColor: colors.background,
    borderRadius: 18,
    gap: spacing.sm,
    padding: spacing.md
  },
  setInfo: {
    gap: 4
  },
  setTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: "700"
  },
  setMeta: {
    color: colors.textSecondary,
    fontSize: 14
  },
  setActions: {
    gap: spacing.sm
  },
  feedbackSection: {
    gap: spacing.sm
  },
  feedbackTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "700"
  },
  feedbackOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  feedbackChip: {
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  feedbackChipSelected: {
    backgroundColor: colors.accentStrong,
    borderColor: colors.accentStrong
  },
  feedbackChipLabel: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: "600"
  },
  feedbackChipLabelSelected: {
    color: colors.surface
  }
});
