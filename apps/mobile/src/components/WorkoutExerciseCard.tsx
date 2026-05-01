import type { EffortFeedback, ExerciseEntryDto, SetDto } from "@fitness/shared";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import {
  adjustWeightText,
  buildLogSetRequestFromDraft,
  getPreviousLoggedSet,
  getSetLogDefaultDraft,
  getSetOutcomeText,
  getSetStatusLabel,
  normalizeRepsInput,
  normalizeWeightInput,
  validateSetLogDraft,
  type SetLogDraft
} from "../features/workout/utils/set-logging.shared";
import { colors, spacing } from "../theme/tokens";
import { PrimaryButton } from "./PrimaryButton";

const effortOptions: EffortFeedback[] = ["too_easy", "just_right", "too_hard"];
const weightAdjustments = [-5, -2.5, 2.5, 5];

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

export function WorkoutExerciseCard(props: {
  exercise: ExerciseEntryDto;
  selectedFeedback?: EffortFeedback;
  highlightMissingFeedback?: boolean;
  loggingSetId?: string | null;
  editingSetId?: string | null;
  submittingSetIds?: Record<string, boolean>;
  deletingSetIds?: Record<string, boolean>;
  addingSet?: boolean;
  setLogDraftsBySetId: Record<string, SetLogDraft>;
  onChangeSetLogDraft: (setId: string, draft: SetLogDraft) => void;
  onAddSet: (exercise: ExerciseEntryDto) => void;
  onDeleteSet: (set: SetDto) => void;
  onLogSet: (exercise: ExerciseEntryDto, set: SetDto, draft: SetLogDraft) => void;
  onStartEditSet: (set: SetDto) => void;
  onCancelEditSet: (set: SetDto) => void;
  onUpdateLoggedSet: (exercise: ExerciseEntryDto, set: SetDto, draft: SetLogDraft) => void;
  onSelectFeedback: (feedback: EffortFeedback) => void;
}) {
  const maxSetNumber = props.exercise.sets.reduce(
    (maxNumber, set) => Math.max(maxNumber, set.setNumber),
    0
  );

  const repRangeText =
    props.exercise.repRangeMin != null &&
    props.exercise.repRangeMax != null &&
    props.exercise.repRangeMax > props.exercise.repRangeMin
      ? `${props.exercise.repRangeMin}-${props.exercise.repRangeMax}`
      : null;

  return (
    <View style={[styles.card, props.highlightMissingFeedback && styles.cardNeedsFeedback]}>
      <View style={styles.header}>
        <Text style={styles.title}>{props.exercise.exerciseName}</Text>
        <Text style={styles.subtitle}>
          {props.exercise.targetSets} x {props.exercise.targetReps}
          {repRangeText ? ` (range ${repRangeText})` : ""} at {props.exercise.targetWeight.value} lb
        </Text>
        <Text style={styles.helper}>Rest {props.exercise.restSeconds ?? 0}s between sets</Text>
      </View>

      <View style={styles.setList}>
        {props.exercise.sets.map((set) => {
          const isPending = set.status === "pending";
          const isEditing = props.editingSetId === set.id;
          const isLogging = props.loggingSetId === set.id || props.submittingSetIds?.[set.id] === true;
          const isDeleting = props.deletingSetIds?.[set.id] === true;
          const canDeleteSet = isPending && set.setNumber === maxSetNumber && props.exercise.sets.length > 1;
          const previousSet = getPreviousLoggedSet({
            sets: props.exercise.sets,
            setNumber: set.setNumber
          });
          const draft = props.setLogDraftsBySetId[set.id] ?? getSetLogDefaultDraft({ set, previousSet });
          const validation = validateSetLogDraft(draft);
          const request = buildLogSetRequestFromDraft(draft);
          const outcomeText = getSetOutcomeText({
            actualReps: validation.actualReps,
            targetReps: set.targetReps,
            actualWeightValue: validation.actualWeight?.value ?? null,
            targetWeightValue: set.targetWeight.value
          });
          const canSubmit = (isPending || isEditing) && request !== null && !isLogging;
          const previousWeight = previousSet?.actualWeight?.value ?? null;

          return (
            <View key={set.id} style={[styles.setRow, !isPending && styles.setRowLogged]}>
              <View style={styles.setInfo}>
                <View style={styles.setTitleRow}>
                  <Text style={styles.setTitle}>Set {set.setNumber}</Text>
                  <View style={styles.setActions}>
                    {canDeleteSet ? (
                      <Pressable
                        accessibilityRole="button"
                        disabled={isLogging || isDeleting}
                        onPress={() => props.onDeleteSet(set)}
                        style={[styles.deleteSetButton, (isLogging || isDeleting) && styles.disabledControl]}
                      >
                        <Text style={styles.deleteSetLabel}>{isDeleting ? "Removing..." : "Remove"}</Text>
                      </Pressable>
                    ) : null}
                    {!isPending ? (
                      <Pressable
                        accessibilityRole="button"
                        disabled={isLogging || isDeleting}
                        onPress={() => (isEditing ? props.onCancelEditSet(set) : props.onStartEditSet(set))}
                        style={[styles.editSetButton, (isLogging || isDeleting) && styles.disabledControl]}
                      >
                        <Text style={styles.editSetLabel}>{isEditing ? "Cancel" : "Edit"}</Text>
                      </Pressable>
                    ) : null}
                    <Text
                      style={[
                        styles.statusPill,
                        set.status === "completed" && styles.statusPillComplete,
                        set.status === "failed" && styles.statusPillFailed
                      ]}
                    >
                      {getSetStatusLabel(set)}
                    </Text>
                  </View>
                </View>
                <Text style={styles.setMeta}>
                  Target {set.targetReps} reps at {set.targetWeight.value} lb
                </Text>
              </View>

              {isPending || isEditing ? (
                <View style={styles.pendingSetBody}>
                  <View style={styles.inputGrid}>
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Reps</Text>
                      <View style={styles.stepperRow}>
                        <Pressable
                          accessibilityRole="button"
                          disabled={isLogging}
                          onPress={() => {
                            const nextReps = Math.max(0, (validation.actualReps ?? 0) - 1);
                            props.onChangeSetLogDraft(set.id, {
                              ...draft,
                              repsText: nextReps.toString()
                            });
                          }}
                          style={[styles.stepperButton, isLogging && styles.disabledControl]}
                        >
                          <Text style={styles.stepperLabel}>-</Text>
                        </Pressable>
                        <TextInput
                          accessibilityLabel={`Set ${set.setNumber} reps`}
                          editable={!isLogging}
                          inputMode="numeric"
                          keyboardType="number-pad"
                          maxLength={3}
                          onChangeText={(value) =>
                            props.onChangeSetLogDraft(set.id, {
                              ...draft,
                              repsText: normalizeRepsInput(value)
                            })
                          }
                          onSubmitEditing={() => {
                            if (canSubmit) {
                              if (isPending) {
                                props.onLogSet(props.exercise, set, draft);
                              } else {
                                props.onUpdateLoggedSet(props.exercise, set, draft);
                              }
                            }
                          }}
                          returnKeyType="done"
                          selectTextOnFocus
                          style={styles.setInput}
                          value={draft.repsText}
                        />
                        <Pressable
                          accessibilityRole="button"
                          disabled={isLogging}
                          onPress={() => {
                            const nextReps = (validation.actualReps ?? 0) + 1;
                            props.onChangeSetLogDraft(set.id, {
                              ...draft,
                              repsText: nextReps.toString()
                            });
                          }}
                          style={[styles.stepperButton, isLogging && styles.disabledControl]}
                        >
                          <Text style={styles.stepperLabel}>+</Text>
                        </Pressable>
                      </View>
                    </View>
                    <View style={styles.inputGroup}>
                      <View style={styles.labelRow}>
                        <Text style={styles.inputLabel}>Load</Text>
                        {previousWeight !== null ? (
                          <Text style={styles.previousValue}>Previous {previousWeight} lb</Text>
                        ) : null}
                      </View>
                      <View style={styles.weightEntryRow}>
                        <TextInput
                          accessibilityLabel={`Set ${set.setNumber} load`}
                          editable={!isLogging}
                          inputMode="decimal"
                          keyboardType="decimal-pad"
                          maxLength={7}
                          onChangeText={(value) =>
                            props.onChangeSetLogDraft(set.id, {
                              ...draft,
                              weightText: normalizeWeightInput(value)
                            })
                          }
                          onSubmitEditing={() => {
                            if (canSubmit) {
                              if (isPending) {
                                props.onLogSet(props.exercise, set, draft);
                              } else {
                                props.onUpdateLoggedSet(props.exercise, set, draft);
                              }
                            }
                          }}
                          returnKeyType="done"
                          selectTextOnFocus
                          style={styles.weightInput}
                          value={draft.weightText}
                        />
                      </View>
                      <View style={styles.weightAdjustRow}>
                        {weightAdjustments.map((delta) => (
                          <Pressable
                            key={delta}
                            accessibilityRole="button"
                            disabled={isLogging}
                            onPress={() =>
                              props.onChangeSetLogDraft(set.id, {
                                ...draft,
                                weightText: adjustWeightText({
                                  weightText: draft.weightText,
                                  delta
                                })
                              })
                            }
                            style={[styles.weightAdjustButton, isLogging && styles.disabledControl]}
                          >
                            <Text style={styles.weightAdjustLabel}>
                              {delta > 0 ? `+${delta}` : delta}
                            </Text>
                          </Pressable>
                        ))}
                      </View>
                    </View>
                  </View>
                  <Text style={[styles.setHint, validation.error && styles.setHintError]}>
                    {validation.error ?? outcomeText}
                  </Text>
                  <PrimaryButton
                    label={
                      isLogging
                        ? "Saving..."
                        : request
                          ? isPending
                            ? `Log ${request.actualReps} @ ${request.actualWeight?.value ?? set.targetWeight.value} lb`
                            : `Update ${request.actualReps} @ ${request.actualWeight?.value ?? set.targetWeight.value} lb`
                          : isPending
                            ? "Log set"
                            : "Update set"
                    }
                    onPress={() =>
                      isPending
                        ? props.onLogSet(props.exercise, set, draft)
                        : props.onUpdateLoggedSet(props.exercise, set, draft)
                    }
                    disabled={!canSubmit}
                    loading={isLogging}
                  />
                </View>
              ) : (
                <Text style={styles.loggedSummary}>
                  Logged {set.actualReps ?? 0} reps at {set.actualWeight?.value ?? set.targetWeight.value} lb
                </Text>
              )}
            </View>
          );
        })}
      </View>

      <PrimaryButton
        label={props.addingSet ? "Adding set..." : "Add set"}
        tone="secondary"
        onPress={() => props.onAddSet(props.exercise)}
        disabled={props.addingSet}
        loading={props.addingSet}
      />

      <View style={styles.feedbackSection}>
        <Text style={styles.feedbackTitle}>How did this exercise feel?</Text>
        {props.highlightMissingFeedback && props.selectedFeedback === undefined ? (
          <Text style={styles.feedbackHint}>Rate effort to finish this workout.</Text>
        ) : null}
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
    borderRadius: 12,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.lg
  },
  cardNeedsFeedback: {
    backgroundColor: colors.accentMuted,
    borderColor: colors.accent
  },
  header: {
    gap: spacing.xs
  },
  title: {
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: "600"
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
    borderColor: "transparent",
    borderRadius: 12,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md
  },
  setRowLogged: {
    borderColor: colors.border,
    opacity: 0.86
  },
  setInfo: {
    gap: 4
  },
  setTitleRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "space-between"
  },
  setTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: "600"
  },
  setActions: {
    alignItems: "center",
    flexDirection: "row",
    flexShrink: 0,
    flexWrap: "wrap",
    gap: spacing.xs,
    justifyContent: "flex-end"
  },
  deleteSetButton: {
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5
  },
  deleteSetLabel: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: "600"
  },
  editSetButton: {
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5
  },
  editSetLabel: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: "600"
  },
  setMeta: {
    color: colors.textSecondary,
    fontSize: 14
  },
  statusPill: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 999,
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "600",
    overflow: "hidden",
    paddingHorizontal: spacing.sm,
    paddingVertical: 5
  },
  statusPillComplete: {
    backgroundColor: colors.success,
    color: colors.surface
  },
  statusPillFailed: {
    backgroundColor: colors.danger,
    color: colors.surface
  },
  pendingSetBody: {
    gap: spacing.sm
  },
  inputGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  inputGroup: {
    flexBasis: "100%",
    flexGrow: 1,
    flexShrink: 1,
    gap: 6,
    maxWidth: "100%",
    minWidth: 0
  },
  inputLabel: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: "600"
  },
  labelRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.sm
  },
  previousValue: {
    color: colors.textSecondary,
    flexShrink: 1,
    fontSize: 12,
    fontWeight: "600",
    textAlign: "right"
  },
  stepperRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs,
    maxWidth: "100%",
    minWidth: 0
  },
  stepperButton: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 10,
    borderWidth: 1,
    flexShrink: 0,
    height: 48,
    justifyContent: "center",
    width: 44
  },
  stepperLabel: {
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: "600"
  },
  disabledControl: {
    opacity: 0.55
  },
  setInput: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 10,
    borderWidth: 1,
    color: colors.textPrimary,
    flex: 1,
    flexShrink: 1,
    fontSize: 20,
    fontWeight: "600",
    minWidth: 48,
    minHeight: 48,
    paddingHorizontal: spacing.sm,
    textAlign: "center"
  },
  weightInput: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 10,
    borderWidth: 1,
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: "600",
    maxWidth: "100%",
    minHeight: 48,
    minWidth: 0,
    paddingHorizontal: spacing.sm,
    width: "100%"
  },
  weightEntryRow: {
    maxWidth: "100%"
  },
  weightAdjustRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs
  },
  weightAdjustButton: {
    alignItems: "center",
    backgroundColor: colors.surfaceMuted,
    borderColor: "transparent",
    borderRadius: 10,
    borderWidth: 1,
    flexBasis: "23%",
    flexGrow: 1,
    minHeight: 40,
    justifyContent: "center"
  },
  weightAdjustLabel: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: "600"
  },
  setHint: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: "600"
  },
  setHintError: {
    color: colors.danger
  },
  loggedSummary: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: "600"
  },
  feedbackSection: {
    gap: spacing.sm
  },
  feedbackTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "600"
  },
  feedbackHint: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20
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
