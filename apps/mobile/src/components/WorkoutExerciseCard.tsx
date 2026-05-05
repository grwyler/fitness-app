import {
  formatWeightForUser,
  type EffortFeedback,
  type ExerciseEntryDto,
  type SetDto,
  type SetFailureStatus,
  type SetRir,
  type UnitSystem
} from "@fitness/shared";
import { Pressable, StyleSheet, View } from "react-native";
import {
  adjustWeightText,
  buildLogSetRequestFromDraft,
  formatSetEffortSummary as formatSetEffortSummaryText,
  getPreviousLoggedSet,
  getSetLogDefaultDraft,
  getSetOutcomeText,
  getSetStatusLabel,
  normalizeRepsInput,
  normalizeWeightInput,
  validateSetLogDraft,
  type SetLogDraft
} from "../features/workout/utils/set-logging.shared";
import { formatExerciseTargetSummary } from "../features/workout/utils/weight-display.shared";
import { colors, radius, spacing } from "../theme/tokens";
import { AppText } from "./AppText";
import { PrimaryButton } from "./PrimaryButton";
import { Card } from "./Card";
import { Chip } from "./Chip";
import { SetMetricInput } from "./SetMetricInput";

const effortOptions: EffortFeedback[] = ["too_easy", "just_right", "too_hard"];
const setRirOptions: Array<{ value: SetRir; label: string }> = [
  { value: "rir_0", label: "0" },
  { value: "rir_1", label: "1" },
  { value: "rir_2", label: "2" },
  { value: "rir_3", label: "3" },
  { value: "rir_4", label: "4" },
  { value: "rir_5_plus", label: "5+" }
];
const maxFailureOptions: Array<{ value: SetFailureStatus | null; label: string }> = [
  { value: null, label: "No failure" },
  { value: "muscular_failure", label: "Failure" },
  { value: "technical_failure", label: "Tech fail" }
];

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
  unitSystem: UnitSystem;
  readOnly?: boolean;
  selectedFeedback?: EffortFeedback;
  highlightMissingFeedback?: boolean;
  loggingSetId?: string | null;
  editingSetId?: string | null;
  recentlyLoggedSetId?: string | null;
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
  const readOnly = props.readOnly === true;
  const maxSetNumber = props.exercise.sets.reduce(
    (maxNumber, set) => Math.max(maxNumber, set.setNumber),
    0
  );

  const pendingSets = props.exercise.sets
    .filter((set) => set.status === "pending")
    .sort((left, right) => left.setNumber - right.setNumber);
  const currentPendingSetId = pendingSets[0]?.id ?? null;
  const nextUpPendingSetId = pendingSets[1]?.id ?? null;
  const unitLabel = props.unitSystem === "metric" ? "kg" : "lb";
  const weightAdjustments = props.unitSystem === "metric" ? [-2.5, -1, 1, 2.5] : [-5, -2.5, 2.5, 5];

  return (
    <Card variant="default" style={[styles.card, props.highlightMissingFeedback && styles.cardNeedsFeedback]}>
      <View style={styles.header}>
        <AppText variant="cardTitle">{props.exercise.exerciseName}</AppText>
        <AppText tone="secondary">
          {formatExerciseTargetSummary({
            targetSets: props.exercise.targetSets,
            targetReps: props.exercise.targetReps,
            repRangeMin: props.exercise.repRangeMin,
            repRangeMax: props.exercise.repRangeMax,
            targetWeightLbs: props.exercise.targetWeight.value,
            unitSystem: props.unitSystem
          })}
        </AppText>
        <AppText variant="caption" tone="secondary">
          Rest {props.exercise.restSeconds ?? 0}s between sets
        </AppText>
      </View>

      <View style={styles.setList}>
        {props.exercise.sets.map((set, setIndex) => {
          const isPending = set.status === "pending";
          const isEditing = props.editingSetId === set.id;
          const isLogging = props.loggingSetId === set.id || props.submittingSetIds?.[set.id] === true;
          const isDeleting = props.deletingSetIds?.[set.id] === true;
          const isCurrentPending = isPending && currentPendingSetId === set.id;
          const isNextUp = isPending && nextUpPendingSetId === set.id;
          const isJustLogged = props.recentlyLoggedSetId === set.id && !isPending;
          const canDeleteSet = isPending && set.setNumber === maxSetNumber && props.exercise.sets.length > 1;
          const isLastSet = setIndex === props.exercise.sets.length - 1;
          const previousSet = getPreviousLoggedSet({
            sets: props.exercise.sets,
            setNumber: set.setNumber
          });
          const draft =
            props.setLogDraftsBySetId[set.id] ?? getSetLogDefaultDraft({ set, previousSet, unitSystem: props.unitSystem });
          const validation = validateSetLogDraft(draft, { unitSystem: props.unitSystem });
          const request = buildLogSetRequestFromDraft(draft, { unitSystem: props.unitSystem });
          const outcomeText = getSetOutcomeText({
            actualReps: validation.actualReps,
            targetReps: set.targetReps,
            actualWeightValue: validation.actualWeight?.value ?? null,
            targetWeightValue: set.targetWeight.value
          });
          const canSubmit = (isPending || isEditing) && request !== null && !isLogging && !readOnly;
          const previousWeight = previousSet?.actualWeight?.value ?? null;
          const loggedOutcomeText = !isPending
            ? getSetOutcomeText({
                actualReps: set.actualReps ?? null,
                targetReps: set.targetReps,
                actualWeightValue: set.actualWeight?.value ?? null,
                targetWeightValue: set.targetWeight.value
              })
            : null;
          const outcomeTone =
            loggedOutcomeText === "Meets target"
              ? ("success" as const)
              : loggedOutcomeText === "Below target" || loggedOutcomeText === "Heavy work"
                ? ("secondary" as const)
                : null;

          return (
            <View
              key={set.id}
              style={[
                styles.setRow,
                !isLastSet ? styles.setRowDivider : null,
                isPending && !isCurrentPending ? styles.setRowPending : null,
                isCurrentPending || isLogging ? styles.setRowCurrent : null,
                isNextUp ? styles.setRowNextUp : null,
                !isPending && set.status === "failed" ? styles.setRowMissed : null,
                !isPending && set.status === "skipped" ? styles.setRowSkipped : null,
                isJustLogged ? styles.setRowJustLogged : null,
                isEditing ? styles.setRowEditing : null
              ]}
            >
              <View style={styles.setRowContent}>
                <View style={styles.setTitleRow}>
                  <AppText variant="bodyStrong">Set {set.setNumber}</AppText>
                  <View style={styles.setActions}>
                    {isCurrentPending ? (
                      <AppText variant="caption" tone="accent" style={styles.statusTag}>
                        {isLogging ? "Saving..." : "Current"}
                      </AppText>
                    ) : isNextUp ? (
                      <AppText variant="caption" tone="tertiary" style={styles.statusTag}>
                        Next
                      </AppText>
                    ) : !isPending && set.status !== "completed" ? (
                      <AppText variant="caption" tone={set.status === "failed" ? "secondary" : "tertiary"} style={styles.statusTag}>
                        {getSetStatusLabel(set)}
                      </AppText>
                    ) : null}
                    {canDeleteSet && !readOnly ? (
                      <InlineTextButton
                        label={isDeleting ? "Removing..." : "Remove"}
                        disabled={isLogging || isDeleting}
                        onPress={() => props.onDeleteSet(set)}
                        tone="danger"
                      />
                    ) : null}
                    {!isPending && !readOnly ? (
                      <InlineTextButton
                        label={isEditing ? "Cancel" : "Edit"}
                        disabled={isLogging || isDeleting}
                        onPress={() => (isEditing ? props.onCancelEditSet(set) : props.onStartEditSet(set))}
                        tone={isEditing ? "accent" : "secondary"}
                      />
                    ) : null}
                  </View>
                </View>
                <AppText variant="caption" tone="secondary">
                  Target {set.targetReps} reps at{" "}
                  {formatWeightForUser({ weightLbs: set.targetWeight.value, unitSystem: props.unitSystem }).text}
                </AppText>
              </View>

              {isPending || isEditing ? (
                <View style={styles.pendingSetBody}>
                  <View style={styles.inputGrid}>
                    <SetMetricInput
                      label="Reps"
                      accessibilityLabel={`Set ${set.setNumber} reps`}
                      disabled={isLogging || readOnly}
                      error={Boolean(validation.error)}
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
                      stepper={{
                        onDecrement: () => {
                          const nextReps = Math.max(0, (validation.actualReps ?? 0) - 1);
                          props.onChangeSetLogDraft(set.id, {
                            ...draft,
                            repsText: nextReps.toString()
                          });
                        },
                        onIncrement: () => {
                          const nextReps = (validation.actualReps ?? 0) + 1;
                          props.onChangeSetLogDraft(set.id, {
                            ...draft,
                            repsText: nextReps.toString()
                          });
                        }
                      }}
                      value={draft.repsText}
                    />
                    <SetMetricInput
                      label={`Load (${unitLabel})`}
                      accessibilityLabel={`Set ${set.setNumber} load`}
                      disabled={isLogging || readOnly}
                      error={Boolean(validation.error)}
                      helperRight={
                        previousWeight !== null ? (
                          <AppText variant="caption" tone="secondary" style={styles.previousValue}>
                            Previous {formatWeightForUser({ weightLbs: previousWeight, unitSystem: props.unitSystem }).text}
                          </AppText>
                        ) : null
                      }
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
                      textAlign="left"
                      value={draft.weightText}
                    />
                    <View style={styles.weightAdjustRow}>
                      {weightAdjustments.map((delta) => (
                        <Pressable
                          key={delta}
                          accessibilityRole="button"
                          disabled={isLogging || readOnly}
                          onPress={() =>
                            props.onChangeSetLogDraft(set.id, {
                              ...draft,
                              weightText: adjustWeightText({
                                weightText: draft.weightText,
                                delta
                              })
                            })
                          }
                          style={({ pressed }) => [
                            styles.adjustButton,
                            isLogging || readOnly ? styles.disabled : null,
                            pressed && !(isLogging || readOnly) ? styles.adjustButtonPressed : null
                          ]}
                        >
                          <AppText variant="meta" tone="secondary" style={styles.adjustButtonLabel}>
                            {delta > 0 ? `+${delta}` : String(delta)}
                          </AppText>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                  <AppText variant={validation.error ? "error" : "caption"} tone={validation.error ? "danger" : "secondary"}>
                    {validation.error ?? outcomeText}
                  </AppText>

                  <View style={styles.effortSection}>
                    <AppText variant="caption" tone="secondary">
                      Reps in reserve (optional)
                    </AppText>

                    <View style={styles.effortChipsRow}>
                      {setRirOptions.map((option) => {
                        const selected =
                          (draft.rir ?? null) === option.value && (draft.failureStatus ?? null) !== "stopped_early";

                        return (
                          <Chip
                            key={option.value}
                            label={option.label}
                            onPress={() => {
                              const nextRir = selected ? null : option.value;
                              const clearsFailure = nextRir !== null && nextRir !== "rir_0";

                              props.onChangeSetLogDraft(set.id, {
                                ...draft,
                                rir: nextRir,
                                ...(draft.failureStatus === "stopped_early" ? { failureStatus: null } : {}),
                                ...(clearsFailure ? { failureStatus: null } : {})
                              });
                            }}
                            selected={selected}
                            variant={selected ? "selected" : "muted"}
                            disabled={isLogging || readOnly}
                          />
                        );
                      })}
                      <Chip
                        label="Stopped early"
                        onPress={() => {
                          const selected = (draft.failureStatus ?? null) === "stopped_early";
                          props.onChangeSetLogDraft(set.id, {
                            ...draft,
                            failureStatus: selected ? null : "stopped_early",
                            rir: null
                          });
                        }}
                        selected={(draft.failureStatus ?? null) === "stopped_early"}
                        variant={(draft.failureStatus ?? null) === "stopped_early" ? "selected" : "muted"}
                        disabled={isLogging || readOnly}
                      />
                    </View>

                    <AppText variant="caption" tone="tertiary" style={styles.effortHelper}>
                      How many reps you could still do. 0 = max effort.
                    </AppText>

                    {draft.rir === "rir_0" ? (
                      <View style={styles.effortRow}>
                        <AppText variant="caption" tone="secondary" style={styles.effortLabel}>
                          Failure type
                        </AppText>
                        <View style={styles.effortChips}>
                          {maxFailureOptions.map((option) => {
                            const selected = (draft.failureStatus ?? null) === option.value;
                            return (
                              <Chip
                                key={option.label}
                                label={option.label}
                                onPress={() => {
                                  props.onChangeSetLogDraft(set.id, {
                                    ...draft,
                                    failureStatus: selected ? null : option.value,
                                    rir: "rir_0"
                                  });
                                }}
                                selected={selected}
                                variant={selected ? "selected" : "muted"}
                                disabled={isLogging || readOnly}
                              />
                            );
                          })}
                        </View>
                      </View>
                    ) : null}
                  </View>
                  <PrimaryButton
                    label={
                      isLogging
                        ? "Saving..."
                        : request
                          ? isPending
                            ? `Log ${request.actualReps} @ ${formatWeightForUser({
                                weightLbs: request.actualWeight?.value ?? set.targetWeight.value,
                                unitSystem: props.unitSystem
                              }).text}`
                            : `Update ${request.actualReps} @ ${formatWeightForUser({
                                weightLbs: request.actualWeight?.value ?? set.targetWeight.value,
                                unitSystem: props.unitSystem
                              }).text}`
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
                <View style={styles.loggedSummaryRow}>
                  <AppText variant="caption" tone="secondary" style={styles.loggedSummary}>
                    Logged {set.actualReps ?? 0} reps at{" "}
                    {formatWeightForUser({
                      weightLbs: set.actualWeight?.value ?? set.targetWeight.value,
                      unitSystem: props.unitSystem
                    }).text}
                    {formatSetEffortSummaryText({ rir: set.rir, failureStatus: set.failureStatus })
                      ? ` - ${formatSetEffortSummaryText({ rir: set.rir, failureStatus: set.failureStatus })}`
                      : ""}
                  </AppText>
                  {outcomeTone && loggedOutcomeText && loggedOutcomeText !== "Ready" ? (
                    <AppText variant="caption" tone={outcomeTone}>
                      {loggedOutcomeText}
                    </AppText>
                  ) : null}
                </View>
              )}
            </View>
          );
        })}
      </View>

      <PrimaryButton
        label={props.addingSet ? "Adding set..." : "Add set"}
        variant="secondary"
        onPress={() => props.onAddSet(props.exercise)}
        disabled={props.addingSet || readOnly}
        loading={props.addingSet}
      />

      <View style={styles.feedbackSection}>
        <AppText variant="bodyStrong">How did this exercise feel? (optional)</AppText>
        <View style={styles.feedbackOptions}>
          {effortOptions.map((option) => {
            const selected = props.selectedFeedback === option;

            return (
              <Chip
                key={option}
                label={formatFeedbackLabel(option)}
                onPress={() => props.onSelectFeedback(option)}
                selected={selected}
                variant={selected ? "selected" : "muted"}
                disabled={readOnly}
              />
            );
          })}
        </View>
      </View>
    </Card>
  );
}

function InlineTextButton(props: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  tone?: "accent" | "secondary" | "danger";
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={props.disabled}
      onPress={props.onPress}
      style={({ pressed }) => [
        styles.inlineButton,
        props.disabled ? styles.disabled : null,
        pressed && !props.disabled ? styles.inlineButtonPressed : null
      ]}
    >
      <AppText
        variant="caption"
        tone={props.tone === "danger" ? "danger" : props.tone === "accent" ? "accent" : "secondary"}
        style={styles.inlineButtonLabel}
      >
        {props.label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
    padding: spacing.lg
  },
  cardNeedsFeedback: {
    backgroundColor: colors.accentMuted
  },
  header: {
    gap: spacing.xs
  },
  setList: {
    borderRadius: 10,
    overflow: "hidden"
  },
  setRow: {
    gap: spacing.sm,
    paddingVertical: spacing.md
  },
  setRowDivider: { borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth },
  setRowCurrent: {
    backgroundColor: colors.surface,
    borderLeftColor: colors.accentStrong,
    borderLeftWidth: 2,
    paddingLeft: spacing.md - 2
  },
  setRowNextUp: {
    backgroundColor: colors.surface,
    borderLeftColor: "rgba(102, 112, 133, 0.55)",
    borderLeftWidth: 2,
    paddingLeft: spacing.md - 2
  },
  setRowEditing: {
    backgroundColor: colors.surface
  },
  setRowJustLogged: {
    backgroundColor: "rgba(22, 121, 76, 0.04)"
  },
  setRowMissed: {
    borderLeftColor: "rgba(180, 35, 24, 0.45)",
    borderLeftWidth: 2,
    paddingLeft: spacing.md - 2
  },
  setRowSkipped: {
    opacity: 0.78
  },
  setRowPending: {
    opacity: 0.84
  },
  setRowContent: {
    gap: spacing.sm
  },
  setTitleRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "space-between"
  },
  setActions: {
    alignItems: "center",
    flexDirection: "row",
    flexShrink: 0,
    flexWrap: "wrap",
    gap: spacing.xs,
    justifyContent: "flex-end"
  },
  statusTag: {
    marginTop: 1
  },
  pendingSetBody: {
    gap: spacing.sm
  },
  inputGrid: {
    gap: spacing.sm
  },
  previousValue: {
    textAlign: "right"
  },
  weightAdjustRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs
  },
  adjustButton: {
    alignSelf: "flex-start",
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6
  },
  adjustButtonPressed: {
    opacity: 0.9
  },
  adjustButtonLabel: {
    fontSize: 13
  },
  loggedSummary: {
    marginTop: 2
  },
  loggedSummaryRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    justifyContent: "space-between"
  },
  effortSection: {
    gap: spacing.xs,
    marginTop: spacing.xs
  },
  effortHelper: {
    marginTop: 2
  },
  effortChipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    marginTop: spacing.xs
  },
  effortAdvancedRow: {
    alignItems: "flex-start",
    marginTop: spacing.xs
  },
  effortRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs
  },
  effortLabel: {
    minWidth: 52
  },
  effortChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs
  },
  feedbackSection: {
    gap: spacing.sm
  },
  feedbackOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  inlineButton: {
    alignSelf: "flex-start",
    borderRadius: radius.sm,
    paddingHorizontal: spacing.xs,
    paddingVertical: 4
  },
  inlineButtonPressed: {
    backgroundColor: colors.surfaceMuted
  },
  inlineButtonLabel: {
    fontSize: 13
  },
  disabled: {
    opacity: 0.55
  }
});
