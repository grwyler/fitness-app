import { useEffect, useMemo, useState } from "react";
import {
  formatWeightForUser,
  parseWeightInputForUser,
  type ExerciseEntryDto,
  type UnitSystem,
  type UpdateWorkoutExerciseEntryRequest
} from "@fitness/shared";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from "react-native";
import { AppText } from "../../../components/AppText";
import { Button } from "../../../components/Button";
import { Chip } from "../../../components/Chip";
import { Input } from "../../../components/Input";
import { ModalSheet } from "../../../components/ModalSheet";
import { PrimaryButton } from "../../../components/PrimaryButton";
import { colors, spacing } from "../../../theme/tokens";

function parseIntDraft(value: string) {
  if (!value.trim()) {
    return null;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseDurationSecondsDraft(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  if (trimmed.includes(":")) {
    const [minutesText = "", secondsText = ""] = trimmed.split(":");
    const minutes = Number(minutesText);
    const seconds = Number(secondsText);
    if (!Number.isInteger(minutes) || minutes < 0) return null;
    if (!Number.isInteger(seconds) || seconds < 0 || seconds >= 60) return null;
    const total = minutes * 60 + seconds;
    return total > 0 ? total : null;
  }

  const seconds = Number(trimmed);
  return Number.isInteger(seconds) && seconds > 0 ? seconds : null;
}

function parseDistanceMetersDraft(value: string, unitSystem: UnitSystem) {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const distanceValue = Number(trimmed);
  if (!Number.isFinite(distanceValue) || distanceValue < 0) {
    return null;
  }

  return unitSystem === "metric" ? distanceValue * 1000 : distanceValue * 1609.344;
}

function formatDurationDraft(seconds: number) {
  const safe = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safe / 60);
  const remaining = safe % 60;
  return `${minutes}:${remaining.toString().padStart(2, "0")}`;
}

function formatDistanceDraft(distanceMeters: number, unitSystem: UnitSystem) {
  const value = unitSystem === "metric" ? distanceMeters / 1000 : distanceMeters / 1609.344;
  return value.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
}

function getFieldUsage(modality: ExerciseEntryDto["loggingModality"]) {
  const usesReps = modality === "reps_load" || modality === "reps_only";
  const usesWeight = modality === "reps_load" || modality === "reps_only";
  const usesDuration = modality === "time" || modality === "hold" || modality === "time_distance" || modality === "interval";
  const usesDistance = modality === "time_distance" || modality === "distance";
  const usesRounds = modality === "interval";
  return { usesReps, usesWeight, usesDuration, usesDistance, usesRounds };
}

export function EditWorkoutExerciseEntryModal(props: {
  visible: boolean;
  exercise: ExerciseEntryDto | null;
  unitSystem: UnitSystem;
  allowUpdatePlan: boolean;
  errorText?: string | null;
  submitting?: boolean;
  onClose: () => void;
  onSubmit: (request: UpdateWorkoutExerciseEntryRequest) => void;
}) {
  const exercise = props.exercise;
  const [targetSetsText, setTargetSetsText] = useState("1");
  const [targetRepsText, setTargetRepsText] = useState("");
  const [targetWeightText, setTargetWeightText] = useState("");
  const [targetDurationText, setTargetDurationText] = useState("");
  const [targetDistanceText, setTargetDistanceText] = useState("");
  const [targetRoundsText, setTargetRoundsText] = useState("");
  const [restSecondsText, setRestSecondsText] = useState("");
  const [updatePlan, setUpdatePlan] = useState(false);

  const fieldUsage = useMemo(() => (exercise ? getFieldUsage(exercise.loggingModality) : null), [exercise?.loggingModality]);
  const unitLabel = props.unitSystem === "metric" ? "kg" : "lb";
  const distanceUnitLabel = props.unitSystem === "metric" ? "km" : "mi";

  useEffect(() => {
    if (!props.visible || !exercise) {
      return;
    }

    setTargetSetsText(String(exercise.targetSets ?? 1));
    setTargetRepsText(exercise.targetReps != null ? String(exercise.targetReps) : "");
    setTargetWeightText(
      exercise.targetWeight?.value != null
        ? formatWeightForUser({ weightLbs: exercise.targetWeight.value, unitSystem: props.unitSystem }).text.replace(/[^\d.]/g, "")
        : ""
    );
    setTargetDurationText(exercise.targetDurationSeconds != null ? formatDurationDraft(exercise.targetDurationSeconds) : "");
    setTargetDistanceText(exercise.targetDistanceMeters != null ? formatDistanceDraft(exercise.targetDistanceMeters, props.unitSystem) : "");
    setTargetRoundsText(exercise.targetRounds != null ? String(exercise.targetRounds) : "");
    setRestSecondsText(exercise.restSeconds != null ? String(exercise.restSeconds) : "");
    setUpdatePlan(false);
  }, [exercise, props.unitSystem, props.visible]);

  const validationError = useMemo(() => {
    if (!exercise || !fieldUsage) {
      return "Exercise unavailable.";
    }

    const sets = parseIntDraft(targetSetsText);
    if (sets === null || sets <= 0 || sets > 20) {
      return "Sets must be between 1 and 20.";
    }

    if (fieldUsage.usesReps) {
      const reps = parseIntDraft(targetRepsText);
      if (reps === null || reps <= 0 || reps > 200) {
        return "Reps must be between 1 and 200.";
      }
    }

    if (fieldUsage.usesDuration && targetDurationText.trim()) {
      if (parseDurationSecondsDraft(targetDurationText) === null) {
        return "Duration must be seconds or mm:ss (for example 8:00).";
      }
    }

    if (fieldUsage.usesDistance && targetDistanceText.trim()) {
      if (parseDistanceMetersDraft(targetDistanceText, props.unitSystem) === null) {
        return `Distance must be a number in ${distanceUnitLabel}.`;
      }
    }

    if (fieldUsage.usesRounds && targetRoundsText.trim()) {
      const rounds = parseIntDraft(targetRoundsText);
      if (rounds === null || rounds <= 0) {
        return "Rounds must be a positive whole number.";
      }
    }

    if (restSecondsText.trim()) {
      const rest = parseIntDraft(restSecondsText);
      if (rest === null || rest < 0 || rest > 1800) {
        return "Rest must be between 0 and 1800 seconds.";
      }
    }

    return null;
  }, [
    distanceUnitLabel,
    exercise,
    fieldUsage,
    props.unitSystem,
    restSecondsText,
    targetDistanceText,
    targetDurationText,
    targetRepsText,
    targetRoundsText,
    targetSetsText
  ]);

  return (
    <ModalSheet
      visible={props.visible}
      title="Edit exercise"
      subtitle={exercise?.exerciseName}
      onClose={props.onClose}
      headerRight={<Button label="Close" variant="ghost" onPress={props.onClose} />}
    >
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {props.allowUpdatePlan ? (
            <View style={styles.scopeRow}>
              <Chip
                label="This workout"
                onPress={() => setUpdatePlan(false)}
                selected={!updatePlan}
                variant={!updatePlan ? "selected" : "muted"}
                disabled={props.submitting}
              />
              <Chip
                label="Update plan"
                onPress={() => setUpdatePlan(true)}
                selected={updatePlan}
                variant={updatePlan ? "selected" : "muted"}
                disabled={props.submitting}
              />
            </View>
          ) : null}

          <Input
            label="Sets"
            keyboardType="number-pad"
            inputMode="numeric"
            value={targetSetsText}
            onChangeText={setTargetSetsText}
            editable={!props.submitting}
          />

          {fieldUsage?.usesReps ? (
            <Input
              label="Reps"
              keyboardType="number-pad"
              inputMode="numeric"
              value={targetRepsText}
              onChangeText={setTargetRepsText}
              editable={!props.submitting}
            />
          ) : null}

          {fieldUsage?.usesWeight ? (
            <Input
              label={`Load (${unitLabel})${exercise?.loggingModality === "reps_only" ? " (optional)" : ""}`}
              keyboardType="decimal-pad"
              inputMode="decimal"
              value={targetWeightText}
              onChangeText={setTargetWeightText}
              editable={!props.submitting}
              helperText={exercise?.loggingModality === "reps_only" ? "Leave blank for bodyweight." : null}
            />
          ) : null}

          {fieldUsage?.usesDuration ? (
            <Input
              label="Duration (mm:ss or seconds)"
              keyboardType="default"
              inputMode="text"
              value={targetDurationText}
              onChangeText={setTargetDurationText}
              editable={!props.submitting}
              placeholder="8:00"
            />
          ) : null}

          {fieldUsage?.usesDistance ? (
            <Input
              label={`Distance (${distanceUnitLabel})`}
              keyboardType="decimal-pad"
              inputMode="decimal"
              value={targetDistanceText}
              onChangeText={setTargetDistanceText}
              editable={!props.submitting}
              placeholder="1.00"
            />
          ) : null}

          {fieldUsage?.usesRounds ? (
            <Input
              label="Rounds"
              keyboardType="number-pad"
              inputMode="numeric"
              value={targetRoundsText}
              onChangeText={setTargetRoundsText}
              editable={!props.submitting}
            />
          ) : null}

          <Input
            label="Rest between sets (seconds)"
            keyboardType="number-pad"
            inputMode="numeric"
            value={restSecondsText}
            onChangeText={setRestSecondsText}
            editable={!props.submitting}
            placeholder="90"
          />

          {props.errorText ? <AppText variant="error">{props.errorText}</AppText> : null}
          {validationError ? <AppText variant="error">{validationError}</AppText> : null}

          <PrimaryButton
            label={props.submitting ? "Saving..." : "Save changes"}
            disabled={Boolean(validationError) || props.submitting || !exercise}
            loading={props.submitting}
            onPress={() => {
              if (!exercise || !fieldUsage) {
                return;
              }

              const sets = parseIntDraft(targetSetsText) ?? 1;
              const reps = fieldUsage.usesReps ? parseIntDraft(targetRepsText) : null;
              const weight = fieldUsage.usesWeight
                ? (() => {
                    const parsed = parseWeightInputForUser({
                      weightText: targetWeightText,
                      unitSystem: props.unitSystem
                    });
                    return parsed ?? null;
                  })()
                : null;
              const durationSeconds = fieldUsage.usesDuration ? parseDurationSecondsDraft(targetDurationText) : null;
              const distanceMeters = fieldUsage.usesDistance ? parseDistanceMetersDraft(targetDistanceText, props.unitSystem) : null;
              const rounds = fieldUsage.usesRounds ? parseIntDraft(targetRoundsText) : null;
              const restSeconds = restSecondsText.trim() ? parseIntDraft(restSecondsText) : null;

              const request: UpdateWorkoutExerciseEntryRequest = {
                targetSets: sets,
                targetReps: reps,
                targetWeight: fieldUsage.usesWeight && weight !== null ? { value: weight, unit: "lb" } : null,
                targetDurationSeconds: durationSeconds,
                targetDistanceMeters: distanceMeters,
                targetRounds: rounds,
                restSeconds: restSeconds ?? null,
                ...(updatePlan ? { updatePlan: true } : {})
              };

              props.onSubmit(request);
            }}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </ModalSheet>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.md,
    paddingBottom: spacing.lg
  },
  scopeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  hint: {
    color: colors.textSecondary
  }
});
