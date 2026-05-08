import { useMemo, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import type {
  ProgramWorkoutExerciseDto,
  ProgramWorkoutTemplateDto,
  UnitSystem,
  WorkoutSetTargetDto
} from "@fitness/shared";
import { AppText } from "../../../components/AppText";
import { Button } from "../../../components/Button";
import { Card } from "../../../components/Card";
import { Chip } from "../../../components/Chip";
import { Input } from "../../../components/Input";
import { ModalSheet } from "../../../components/ModalSheet";
import { PrimaryButton } from "../../../components/PrimaryButton";
import { colors, spacing } from "../../../theme/tokens";
import {
  formatExercisePrescriptionSummary,
  formatRepTargetFromExercise,
  formatWeightShort,
  normalizeRepTargetText,
  parseRepTargetText,
  parseWeightDraft
} from "../utils/prescription.shared";
import {
  EXERCISE_CARD_LAYOUT_VARIANT,
  getExerciseEntryOverflowActionLabels,
  getExerciseEntryPrimaryActionLabels,
  getWorkoutCardActionVisibility,
  getWorkoutEntryOverflowActionLabels,
  getWorkoutEntryPrimaryActionLabels
} from "../utils/program-day-workout-builder-card.shared";
import {
  getExerciseEditFieldLabels,
  getExerciseEditHelperCopy,
  getExerciseEditVisibleFields,
  parseIntDraft,
  validateExerciseEditDraft
} from "../utils/exercise-entry-edit.shared";
import { removeExerciseFromWorkoutTemplate } from "../utils/program-builder-mutations.shared";

type EditMode = "simple" | "by_set";

type SimpleEditState =
  | {
      entryId: string;
      mode: EditMode;
      setsText: string;
      repsText: string;
      weightText: string;
      durationText: string;
      distanceText: string;
      roundsText: string;
      notesText: string;
      error: string | null;
    }
  | null;

type SetDraft = {
  repTargetText: string;
  weightText: string;
  durationSecondsText: string;
  distanceMetersText: string;
  rpeText: string;
  noteText: string;
};

type CustomizeState =
  | {
      entryId: string;
      drafts: SetDraft[];
      showAdvanced: boolean;
      error: string | null;
    }
  | null;

function isRepsModality(modality: ProgramWorkoutExerciseDto["loggingModality"]) {
  return modality === "reps_load" || modality === "reps_only";
}

function supportsDuration(modality: ProgramWorkoutExerciseDto["loggingModality"]) {
  return modality === "time" || modality === "hold" || modality === "time_distance" || modality === "interval";
}

function supportsDistance(modality: ProgramWorkoutExerciseDto["loggingModality"]) {
  return modality === "distance" || modality === "time_distance";
}

function supportsRounds(modality: ProgramWorkoutExerciseDto["loggingModality"]) {
  return modality === "interval";
}

function normalizeWorkoutExercises(exercises: ProgramWorkoutExerciseDto[]) {
  return [...exercises]
    .sort((left, right) => left.sequenceOrder - right.sequenceOrder)
    .map((exercise, index) => ({
      ...exercise,
      sequenceOrder: index + 1
    }));
}

export function ProgramDayWorkoutBuilderCard(props: {
  dayNumber: number;
  workout: ProgramWorkoutTemplateDto | null;
  unitSystem: UnitSystem;
  canRemoveWorkout?: boolean;
  onMoveUp?: (() => void) | null;
  onMoveDown?: (() => void) | null;
  onDuplicateWorkout?: (() => void) | null;
  onRemoveWorkoutDay?: (() => void) | null;
  onAddExercisePress: () => void;
  onChangeWorkout: (workout: ProgramWorkoutTemplateDto | null) => void;
}) {
  const workout = props.workout;
  const canRemoveWorkout = props.canRemoveWorkout ?? true;
  const sortedExercises = useMemo(
    () => (workout ? normalizeWorkoutExercises(workout.exercises) : []),
    [workout]
  );

  const [edit, setEdit] = useState<SimpleEditState>(null);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [customize, setCustomize] = useState<CustomizeState>(null);
  const [actionEntryId, setActionEntryId] = useState<string | null>(null);
  const [exerciseRemoveConfirmingEntryId, setExerciseRemoveConfirmingEntryId] = useState<string | null>(null);
  const [workoutActionsVisible, setWorkoutActionsVisible] = useState(false);
  const [workoutRemoveConfirming, setWorkoutRemoveConfirming] = useState(false);

  const editingEntry = editingEntryId
    ? sortedExercises.find((entry) => entry.id === editingEntryId) ?? null
    : null;

  const entryBeingCustomized = customize
    ? sortedExercises.find((entry) => entry.id === customize.entryId) ?? null
    : null;

  const actionEntry = actionEntryId
    ? sortedExercises.find((entry) => entry.id === actionEntryId) ?? null
    : null;

  function updateWorkout(next: ProgramWorkoutTemplateDto) {
    props.onChangeWorkout({
      ...next,
      exercises: normalizeWorkoutExercises(next.exercises)
    });
  }

  function handleRemoveWorkoutIfEmpty(next: ProgramWorkoutTemplateDto) {
    if (next.exercises.length === 0) {
      setEdit(null);
      setCustomize(null);
    }

    updateWorkout(next);
  }

  function moveEntry(entryId: string, direction: -1 | 1) {
    if (!workout) {
      return;
    }

    const normalized = normalizeWorkoutExercises(workout.exercises);
    const index = normalized.findIndex((entry) => entry.id === entryId);
    if (index < 0) {
      return;
    }

    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= normalized.length) {
      return;
    }

    const next = normalized.slice();
    const swap = next[index]!;
    next[index] = next[nextIndex]!;
    next[nextIndex] = swap;

    updateWorkout({
      ...workout,
      exercises: next
    });
  }

  function startEdit(entry: ProgramWorkoutExerciseDto) {
    const repText = isRepsModality(entry.loggingModality) ? formatRepTargetFromExercise(entry) : "";
    const weightText =
      isRepsModality(entry.loggingModality) && entry.targetWeight
        ? formatWeightShort({ weight: entry.targetWeight, unitSystem: props.unitSystem }).replace(
            /\s*(lb|kg)$/i,
            ""
          )
        : "";

    setEdit({
      entryId: entry.id,
      mode:
        isRepsModality(entry.loggingModality) && entry.setTargets && entry.setTargets.length > 0
          ? "by_set"
          : "simple",
      setsText: String(entry.targetSets),
      repsText: repText,
      weightText,
      durationText: entry.targetDurationSeconds != null ? String(entry.targetDurationSeconds) : "",
      distanceText:
        entry.targetDistanceMeters != null
          ? String(
              props.unitSystem === "metric" ? entry.targetDistanceMeters / 1000 : entry.targetDistanceMeters / 1609.344
            )
          : "",
      roundsText: entry.targetRounds != null ? String(entry.targetRounds) : "",
      notesText: entry.notes?.trim() ?? "",
      error: null
    });
    setEditingEntryId(entry.id);
  }

  function cancelEdit() {
    setEdit(null);
    setEditingEntryId(null);
  }

  function saveSimpleEdit(entry: ProgramWorkoutExerciseDto) {
    if (!workout || !edit || edit.mode !== "simple") {
      return;
    }

    const notes = edit.notesText.trim().replace(/\s+/g, " ");
    const modality = entry.loggingModality;

    const validated = validateExerciseEditDraft({
      modality,
      unitSystem: props.unitSystem,
      setsText: edit.setsText,
      repsText: edit.repsText,
      weightText: edit.weightText,
      durationText: edit.durationText,
      distanceText: edit.distanceText,
      roundsText: edit.roundsText
    });
    if (!validated.ok) {
      const errorMessage =
        (validated as { errorMessage?: string }).errorMessage ?? "Fix the missing fields above.";
      setEdit((current) => (current ? { ...current, error: errorMessage } : current));
      return;
    }

    const sets = validated.sets;

    if (isRepsModality(modality)) {
      const repDraft = validated.repDraft;
      if (!repDraft) {
        setEdit((current) => (current ? { ...current, error: "Enter a rep target or range." } : current));
        return;
      }

      const derivedReps = repDraft.targetReps ?? entry.targetReps;
      const repRangeMin = repDraft.repRangeMin;
      const repRangeMax = repDraft.repRangeMax;
      const weightLbs = validated.weightLbs;

      const nextWorkout: ProgramWorkoutTemplateDto = {
        ...workout,
        exercises: workout.exercises.map((candidate) =>
          candidate.id === entry.id
            ? {
                ...candidate,
                targetSets: sets,
                targetReps: derivedReps,
                repTargetText: normalizeRepTargetText(repDraft.repTargetText),
                ...(repRangeMin !== null && repRangeMax !== null && repRangeMax > repRangeMin
                  ? { repRangeMin, repRangeMax }
                  : { repRangeMin: undefined, repRangeMax: undefined }),
                ...(weightLbs !== null
                  ? { targetWeight: { value: weightLbs, unit: "lb" } }
                  : { targetWeight: undefined }),
                ...(notes ? { notes } : { notes: undefined }),
                setTargets: null
              }
            : candidate
        )
      };

      updateWorkout(nextWorkout);
      setEdit(null);
      setEditingEntryId(null);
      return;
    }

    const durationSeconds = validated.durationSeconds;
    const distanceMeters = validated.distanceMeters;
    const rounds = validated.rounds;

    const nextWorkout: ProgramWorkoutTemplateDto = {
      ...workout,
      exercises: workout.exercises.map((candidate) =>
        candidate.id === entry.id
          ? {
              ...candidate,
              targetSets: sets,
              targetReps: null,
              repTargetText: null,
              repRangeMin: undefined,
              repRangeMax: undefined,
              targetWeight: undefined,
              targetDurationSeconds: durationSeconds,
              targetDistanceMeters: distanceMeters,
              targetRounds: rounds,
              ...(notes ? { notes } : { notes: undefined }),
              setTargets: null
            }
          : candidate
      )
    };

    updateWorkout(nextWorkout);
    setEdit(null);
    setEditingEntryId(null);
  }

  function removeEntry(entryId: string) {
    if (!workout) {
      return;
    }

    const nextWorkout = removeExerciseFromWorkoutTemplate({ workout, entryId });
    if (edit?.entryId === entryId) {
      setEdit(null);
    }
    if (editingEntryId === entryId) {
      setEditingEntryId(null);
    }

    handleRemoveWorkoutIfEmpty(nextWorkout);
  }

  function applySetTargets(entryId: string, setTargets: WorkoutSetTargetDto[]) {
    if (!workout) {
      return;
    }

    const nextWorkout: ProgramWorkoutTemplateDto = {
      ...workout,
      exercises: workout.exercises.map((entry) => {
        if (entry.id !== entryId) {
          return entry;
        }

        const firstRepText = setTargets[0]?.repTargetText?.trim() ?? "";
        const derived = firstRepText ? parseRepTargetText(firstRepText) : null;

        return {
          ...entry,
          targetSets: setTargets.length,
          targetReps: derived?.targetReps ?? entry.targetReps,
          repTargetText: undefined,
          ...(derived?.repRangeMin != null &&
          derived.repRangeMax != null &&
          derived.repRangeMax > derived.repRangeMin
            ? { repRangeMin: derived.repRangeMin, repRangeMax: derived.repRangeMax }
            : { repRangeMin: undefined, repRangeMax: undefined }),
          targetWeight: undefined,
          setTargets
        };
      })
    };

    updateWorkout(nextWorkout);
  }

  function backToSimple(entry: ProgramWorkoutExerciseDto) {
    if (!workout) {
      return;
    }

    if (!isRepsModality(entry.loggingModality)) {
      return;
    }

    const first = entry.setTargets?.[0] ?? null;
    const repText = first?.repTargetText?.trim() ?? "";
    const repDraft = repText ? parseRepTargetText(repText) : null;

    const nextWorkout: ProgramWorkoutTemplateDto = {
      ...workout,
      exercises: workout.exercises.map((candidate) =>
        candidate.id === entry.id
          ? {
              ...candidate,
              setTargets: null,
              repTargetText: repDraft ? normalizeRepTargetText(repDraft.repTargetText) : candidate.repTargetText,
              targetReps: repDraft?.targetReps ?? candidate.targetReps,
              ...(repDraft?.repRangeMin != null &&
              repDraft.repRangeMax != null &&
              repDraft.repRangeMax > repDraft.repRangeMin
                ? { repRangeMin: repDraft.repRangeMin, repRangeMax: repDraft.repRangeMax }
                : { repRangeMin: undefined, repRangeMax: undefined }),
              ...(first?.targetWeight ? { targetWeight: first.targetWeight } : {})
            }
          : candidate
      )
    };

    updateWorkout(nextWorkout);
  }

  function openCustomize(entry: ProgramWorkoutExerciseDto) {
    if (!isRepsModality(entry.loggingModality)) {
      return;
    }

    const baseRepText = formatRepTargetFromExercise(entry);
    const baseWeightText = entry.targetWeight
      ? formatWeightShort({ weight: entry.targetWeight, unitSystem: props.unitSystem }).replace(/\s*(lb|kg)$/i, "")
      : "";

    const initialTargets: WorkoutSetTargetDto[] =
      entry.setTargets && entry.setTargets.length > 0
        ? entry.setTargets
        : Array.from({ length: entry.targetSets }, () => ({
            repTargetText: baseRepText,
            ...(entry.targetWeight ? { targetWeight: entry.targetWeight } : {})
          }));

    setCustomize({
      entryId: entry.id,
      drafts: initialTargets.map((target) => ({
        repTargetText: target.repTargetText?.trim() ?? baseRepText,
        weightText: target.targetWeight
          ? formatWeightShort({ weight: target.targetWeight, unitSystem: props.unitSystem }).replace(/\s*(lb|kg)$/i, "")
          : baseWeightText,
        durationSecondsText: target.durationSeconds ? String(target.durationSeconds) : "",
        distanceMetersText: target.distanceMeters ? String(target.distanceMeters) : "",
        rpeText: target.rpe ? String(target.rpe) : "",
        noteText: target.note?.trim() ?? ""
      })),
      showAdvanced: false,
      error: null
    });
  }

  const isEmpty = !workout || sortedExercises.length === 0;
  const primaryLabels = getExerciseEntryPrimaryActionLabels();
  const overflowLabels = getExerciseEntryOverflowActionLabels();
  const workoutPrimaryLabels = getWorkoutEntryPrimaryActionLabels();
  const workoutOverflowLabels = getWorkoutEntryOverflowActionLabels();
  const workoutActionVisibility = getWorkoutCardActionVisibility({ isEmpty });

  return (
    <Card padding="md" variant="muted" contentStyle={styles.cardContent}>
      <View style={styles.headerStack}>
        <View style={styles.titleCol}>
          <AppText variant="bodyStrong">{`Workout ${props.dayNumber}`}</AppText>
          <AppText variant="caption" tone="secondary">
            {workout
              ? `${workout?.name || "Workout"} \u00b7 ${sortedExercises.length} exercise${
                  sortedExercises.length === 1 ? "" : "s"
                }`
              : "Unassigned"}
          </AppText>
          {isEmpty ? (
            <AppText variant="caption" tone="secondary">
              Needs exercises
            </AppText>
          ) : null}
        </View>

        {workout ? (
          <Input
            autoCapitalize="words"
            label="Workout name"
            value={workout?.name ?? ""}
            onChangeText={(value) => {
              if (!workout) {
                return;
              }

              const nextName = value.replace(/\s+/g, " ").trimStart();
              updateWorkout({
                ...workout,
                name: nextName
              });
            }}
            placeholder="Upper A, Lower A, Push, Pull..."
          />
        ) : null}

        <View style={styles.workoutActionsRow}>
          {workoutActionVisibility.showHeaderAddExercise ? (
            <Button
              label={workoutPrimaryLabels.addExercise}
              onPress={props.onAddExercisePress}
              variant="primary"
              fullWidth={true}
              size="sm"
            />
          ) : null}
          {workoutActionVisibility.showHeaderMore ? (
            <Button
              label={workoutPrimaryLabels.more}
              onPress={() => {
                setWorkoutRemoveConfirming(false);
                setWorkoutActionsVisible(true);
              }}
              variant="ghost"
              fullWidth={false}
              size="sm"
            />
          ) : null}
        </View>
      </View>

      {isEmpty ? (
        null
      ) : (
        <View style={styles.exerciseList}>
          {sortedExercises.map((entry) => {
            const summary = formatExercisePrescriptionSummary({ exercise: entry, unitSystem: props.unitSystem });

            return (
              <View key={entry.id} style={styles.exerciseBlock}>
                <View style={styles.exerciseContent}>
                  <AppText variant="bodyStrong" style={styles.exerciseName} numberOfLines={2}>
                    {entry.exerciseName}
                  </AppText>
                  <AppText variant="caption" tone="secondary" style={styles.exerciseSummary} numberOfLines={2}>
                    {summary}
                  </AppText>
                  <View style={styles.exerciseActionRow}>
                    <Button
                      label={primaryLabels.edit}
                      onPress={() => startEdit(entry)}
                      variant="secondary"
                      fullWidth={false}
                      size="sm"
                    />
                    <Button
                      label={primaryLabels.more}
                      onPress={() => {
                        setExerciseRemoveConfirmingEntryId(null);
                        setActionEntryId(entry.id);
                      }}
                      variant="ghost"
                      fullWidth={false}
                      size="sm"
                    />
                  </View>
                </View>
              </View>
            );
          })}

          {workoutActionVisibility.showFooterAddExercise ? (
            <View style={styles.addMoreRow}>
              <Button
                label={workoutPrimaryLabels.addExercise}
                onPress={props.onAddExercisePress}
                variant="secondary"
                fullWidth={true}
                size="sm"
              />
            </View>
          ) : null}
        </View>
      )}

      <ModalSheet
        visible={actionEntryId !== null && actionEntry !== null}
        onClose={() => {
          setActionEntryId(null);
          setExerciseRemoveConfirmingEntryId(null);
        }}
        title="Exercise actions"
        subtitle={actionEntry?.exerciseName}
        headerRight={
          <PrimaryButton
            label="Close"
            onPress={() => setActionEntryId(null)}
            variant="ghost"
            fullWidth={false}
            size="sm"
          />
        }
        contentStyle={styles.actionsSheetContent}
      >
        {actionEntry ? (
          <View style={styles.actionsSheetBody}>
            {exerciseRemoveConfirmingEntryId === actionEntry.id ? (
              <View style={styles.confirmBlock}>
                <AppText variant="bodyStrong">Remove exercise?</AppText>
                <AppText variant="caption" tone="secondary">
                  This will remove the exercise from this workout.
                </AppText>
                <View style={styles.confirmActions}>
                  <Button
                    label="Cancel"
                    variant="secondary"
                    size="sm"
                    fullWidth={false}
                    onPress={() => setExerciseRemoveConfirmingEntryId(null)}
                  />
                  <Button
                    label={overflowLabels.remove}
                    variant="danger"
                    size="sm"
                    fullWidth={false}
                    onPress={() => {
                      removeEntry(actionEntry.id);
                      setActionEntryId(null);
                      setExerciseRemoveConfirmingEntryId(null);
                    }}
                  />
                </View>
              </View>
            ) : (
              <>
                <Button
                  label={overflowLabels.moveUp}
                  variant="secondary"
                  size="sm"
                  fullWidth={false}
                  disabled={actionEntry.sequenceOrder <= 1}
                  onPress={() => {
                    moveEntry(actionEntry.id, -1);
                    setActionEntryId(null);
                  }}
                />
                <Button
                  label={overflowLabels.moveDown}
                  variant="secondary"
                  size="sm"
                  fullWidth={false}
                  disabled={actionEntry.sequenceOrder >= sortedExercises.length}
                  onPress={() => {
                    moveEntry(actionEntry.id, 1);
                    setActionEntryId(null);
                  }}
                />
                <Button
                  label={overflowLabels.remove}
                  variant="danger"
                  size="sm"
                  fullWidth={false}
                  onPress={() => setExerciseRemoveConfirmingEntryId(actionEntry.id)}
                />
              </>
            )}
          </View>
        ) : null}
      </ModalSheet>

      <ModalSheet
        visible={workoutActionsVisible}
        onClose={() => {
          setWorkoutActionsVisible(false);
          setWorkoutRemoveConfirming(false);
        }}
        title="Workout actions"
        contentStyle={styles.actionsSheetContent}
      >
        <View style={styles.actionsSheetBody}>
          {props.onMoveUp ? (
            <Button
              label={workoutOverflowLabels.moveUp}
              variant="secondary"
              size="sm"
              fullWidth={false}
              onPress={() => {
                props.onMoveUp?.();
                setWorkoutActionsVisible(false);
              }}
            />
          ) : null}
          {props.onMoveDown ? (
            <Button
              label={workoutOverflowLabels.moveDown}
              variant="secondary"
              size="sm"
              fullWidth={false}
              onPress={() => {
                props.onMoveDown?.();
                setWorkoutActionsVisible(false);
              }}
            />
          ) : null}
          {props.onDuplicateWorkout ? (
            <Button
              label={workoutOverflowLabels.duplicate}
              variant="secondary"
              size="sm"
              fullWidth={false}
              onPress={() => {
                props.onDuplicateWorkout?.();
                setWorkoutActionsVisible(false);
              }}
            />
          ) : null}
          {props.onRemoveWorkoutDay ? (
            workoutRemoveConfirming ? (
              <View style={styles.confirmBlock}>
                <AppText variant="bodyStrong">Remove workout?</AppText>
                <AppText variant="caption" tone="secondary">
                  This will remove the workout from your program.
                </AppText>
                <View style={styles.confirmActions}>
                  <Button
                    label="Cancel"
                    variant="secondary"
                    size="sm"
                    fullWidth={false}
                    onPress={() => setWorkoutRemoveConfirming(false)}
                  />
                  <Button
                    label={workoutOverflowLabels.remove}
                    variant="danger"
                    size="sm"
                    fullWidth={false}
                    disabled={!canRemoveWorkout}
                    onPress={() => {
                      if (!canRemoveWorkout) {
                        return;
                      }
                      props.onRemoveWorkoutDay?.();
                      setWorkoutActionsVisible(false);
                      setWorkoutRemoveConfirming(false);
                    }}
                  />
                </View>
                {!canRemoveWorkout ? (
                  <AppText variant="caption" tone="secondary">
                    A program needs at least one workout.
                  </AppText>
                ) : null}
              </View>
            ) : (
              <Button
                label={workoutOverflowLabels.remove}
                variant="danger"
                size="sm"
                fullWidth={false}
                disabled={!canRemoveWorkout}
                onPress={() => setWorkoutRemoveConfirming(true)}
              />
            )
          ) : null}
        </View>
      </ModalSheet>

      <ModalSheet
        visible={editingEntryId !== null && editingEntry !== null && edit !== null && edit.entryId === editingEntryId}
        onClose={cancelEdit}
        title="Edit exercise"
        subtitle={editingEntry ? editingEntry.exerciseName : undefined}
        headerRight={
          <PrimaryButton label="Close" onPress={cancelEdit} variant="ghost" fullWidth={false} size="sm" />
        }
        contentStyle={styles.editSheetContent}
      >
        {editingEntry && edit ? (
          <View style={styles.editSheetBody}>
            {edit.mode === "by_set" && isRepsModality(editingEntry.loggingModality) ? (
              <Card padding="md" variant="muted" contentStyle={styles.customModeCard}>
                <AppText variant="bodyStrong">Customized by set</AppText>
                <AppText variant="caption" tone="secondary">
                  {formatExercisePrescriptionSummary({ exercise: editingEntry, unitSystem: props.unitSystem })}
                </AppText>
                <View style={styles.customModeActions}>
                  <Button
                    label="Edit sets"
                    onPress={() => openCustomize(editingEntry)}
                    variant="secondary"
                    fullWidth={false}
                    size="sm"
                  />
                  <Button
                    label="Back to simple"
                    onPress={() => backToSimple(editingEntry)}
                    variant="ghost"
                    fullWidth={false}
                    size="sm"
                  />
                </View>
              </Card>
            ) : (
              <>
                {(() => {
                  const labels = getExerciseEditFieldLabels({
                    modality: editingEntry.loggingModality,
                    unitSystem: props.unitSystem
                  });
                  const visible = getExerciseEditVisibleFields(editingEntry.loggingModality);
                  const helper = getExerciseEditHelperCopy();

                  return (
                    <>
                      <Card padding="md" variant="muted" contentStyle={styles.editIntroCard}>
                        <AppText variant="bodyStrong">{editingEntry.exerciseName}</AppText>
                        <AppText variant="caption" tone="secondary">
                          {formatExercisePrescriptionSummary({ exercise: editingEntry, unitSystem: props.unitSystem })}
                        </AppText>
                      </Card>

                      <View style={styles.editFields}>
                        <Input
                          label={labels.sets}
                          keyboardType="number-pad"
                          value={edit.setsText}
                          onChangeText={(value) =>
                            setEdit((current) => (current ? { ...current, setsText: value, error: null } : current))
                          }
                          placeholder="3"
                        />
                        {isRepsModality(editingEntry.loggingModality) ? (
                          <AppText variant="caption" tone="secondary">
                            {helper.volumeHint}
                          </AppText>
                        ) : null}

                        {visible.repTarget ? (
                          <Input
                            label={labels.repTarget}
                            value={edit.repsText}
                            onChangeText={(value) =>
                              setEdit((current) => (current ? { ...current, repsText: value, error: null } : current))
                            }
                            placeholder="8, 8-12, AMRAP..."
                          />
                        ) : null}

                        {visible.weight ? (
                          <Input
                            label={labels.weight}
                            keyboardType="decimal-pad"
                            value={edit.weightText}
                            onChangeText={(value) =>
                              setEdit((current) => (current ? { ...current, weightText: value, error: null } : current))
                            }
                            placeholder={props.unitSystem === "metric" ? "60" : "135"}
                          />
                        ) : null}

                        {visible.rounds ? (
                          <Input
                            label={labels.rounds}
                            keyboardType="number-pad"
                            value={edit.roundsText}
                            onChangeText={(value) =>
                              setEdit((current) => (current ? { ...current, roundsText: value, error: null } : current))
                            }
                            placeholder="5"
                          />
                        ) : null}

                        {visible.duration ? (
                          <Input
                            label={labels.duration}
                            value={edit.durationText}
                            onChangeText={(value) =>
                              setEdit((current) =>
                                current ? { ...current, durationText: value, error: null } : current
                              )
                            }
                            placeholder={editingEntry.loggingModality === "hold" ? "0:30" : "20:00"}
                          />
                        ) : null}

                        {visible.distance ? (
                          <Input
                            label={labels.distance}
                            keyboardType="decimal-pad"
                            value={edit.distanceText}
                            onChangeText={(value) =>
                              setEdit((current) =>
                                current ? { ...current, distanceText: value, error: null } : current
                              )
                            }
                            placeholder="2.5"
                          />
                        ) : null}

                        {visible.notes ? (
                          <Input
                            label={labels.notes}
                            value={edit.notesText}
                            onChangeText={(value) =>
                              setEdit((current) => (current ? { ...current, notesText: value, error: null } : current))
                            }
                            placeholder="Optional"
                          />
                        ) : null}
                      </View>

                      {isRepsModality(editingEntry.loggingModality) ? (
                        <View style={styles.editActionsRow}>
                          <Button
                            label="Customize by set"
                            onPress={() => openCustomize(editingEntry)}
                            variant="secondary"
                            fullWidth={false}
                            size="sm"
                          />
                        </View>
                      ) : null}
                    </>
                  );
                })()}
              </>
            )}

            {edit.error ? (
              <AppText variant="meta" tone="danger">
                {edit.error}
              </AppText>
            ) : null}

            {edit.mode === "simple" ? (
              <PrimaryButton label="Save" onPress={() => saveSimpleEdit(editingEntry)} />
            ) : null}
          </View>
        ) : null}
      </ModalSheet>

      <ModalSheet
        visible={customize !== null}
        onClose={() => setCustomize(null)}
        title="Customize sets"
        subtitle={entryBeingCustomized ? entryBeingCustomized.exerciseName : undefined}
        headerRight={
          <PrimaryButton
            label="Close"
            onPress={() => setCustomize(null)}
            variant="ghost"
            fullWidth={false}
            size="sm"
          />
        }
        contentStyle={styles.customizeSheetContent}
      >
        {customize ? (
          <ScrollView
            style={styles.customizeScroll}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.customizeScrollContent}
          >
            <View style={styles.customizeTopRow}>
              <Button
                label={customize.showAdvanced ? "Hide advanced" : "Advanced"}
                onPress={() =>
                  setCustomize((current) =>
                    current ? { ...current, showAdvanced: !current.showAdvanced } : current
                  )
                }
                variant="ghost"
                fullWidth={false}
                size="sm"
              />
              <View style={styles.customizeSetActions}>
                <Button
                  label="Add set"
                  onPress={() =>
                    setCustomize((current) =>
                      current
                        ? {
                            ...current,
                            drafts: [
                              ...current.drafts,
                              {
                                repTargetText: current.drafts[current.drafts.length - 1]?.repTargetText ?? "8",
                                weightText: current.drafts[current.drafts.length - 1]?.weightText ?? "",
                                durationSecondsText: "",
                                distanceMetersText: "",
                                rpeText: "",
                                noteText: ""
                              }
                            ],
                            error: null
                          }
                        : current
                    )
                  }
                  variant="secondary"
                  fullWidth={false}
                  size="sm"
                />
                {customize.drafts.length > 1 ? (
                  <Button
                    label="Remove last"
                    onPress={() =>
                      setCustomize((current) =>
                        current ? { ...current, drafts: current.drafts.slice(0, -1), error: null } : current
                      )
                    }
                    variant="ghost"
                    fullWidth={false}
                    size="sm"
                  />
                ) : null}
              </View>
            </View>

            {customize.drafts.map((draft, index) => (
              <Card key={`set:${index + 1}`} padding="md" variant="elevated" contentStyle={styles.setCard}>
                <AppText variant="bodyStrong">{`Set ${index + 1}`}</AppText>
                <View style={styles.setInputs}>
                  <Input
                    label="Reps"
                    value={draft.repTargetText}
                    onChangeText={(value) =>
                      setCustomize((current) =>
                        current
                          ? {
                              ...current,
                              drafts: current.drafts.map((candidate, candidateIndex) =>
                                candidateIndex === index ? { ...candidate, repTargetText: value } : candidate
                              ),
                              error: null
                            }
                          : current
                      )
                    }
                    placeholder="10, 8-12, AMRAP..."
                  />
                  <Input
                    label="Load (optional)"
                    keyboardType="decimal-pad"
                    value={draft.weightText}
                    onChangeText={(value) =>
                      setCustomize((current) =>
                        current
                          ? {
                              ...current,
                              drafts: current.drafts.map((candidate, candidateIndex) =>
                                candidateIndex === index ? { ...candidate, weightText: value } : candidate
                              ),
                              error: null
                            }
                          : current
                      )
                    }
                    placeholder={props.unitSystem === "metric" ? "60" : "135"}
                  />
                </View>

                {customize.showAdvanced ? (
                  <View style={styles.setInputs}>
                    <Input
                      label="Duration (sec, optional)"
                      keyboardType="number-pad"
                      value={draft.durationSecondsText}
                      onChangeText={(value) =>
                        setCustomize((current) =>
                          current
                            ? {
                                ...current,
                                drafts: current.drafts.map((candidate, candidateIndex) =>
                                  candidateIndex === index ? { ...candidate, durationSecondsText: value } : candidate
                                ),
                                error: null
                              }
                            : current
                        )
                      }
                      placeholder="Optional"
                    />
                    <Input
                      label="Distance (m, optional)"
                      keyboardType="decimal-pad"
                      value={draft.distanceMetersText}
                      onChangeText={(value) =>
                        setCustomize((current) =>
                          current
                            ? {
                                ...current,
                                drafts: current.drafts.map((candidate, candidateIndex) =>
                                  candidateIndex === index ? { ...candidate, distanceMetersText: value } : candidate
                                ),
                                error: null
                              }
                            : current
                        )
                      }
                      placeholder="Optional"
                    />
                    <Input
                      label="RPE (optional)"
                      keyboardType="decimal-pad"
                      value={draft.rpeText}
                      onChangeText={(value) =>
                        setCustomize((current) =>
                          current
                            ? {
                                ...current,
                                drafts: current.drafts.map((candidate, candidateIndex) =>
                                  candidateIndex === index ? { ...candidate, rpeText: value } : candidate
                                ),
                                error: null
                              }
                            : current
                        )
                      }
                      placeholder="Optional"
                    />
                    <Input
                      label="Note (optional)"
                      value={draft.noteText}
                      onChangeText={(value) =>
                        setCustomize((current) =>
                          current
                            ? {
                                ...current,
                                drafts: current.drafts.map((candidate, candidateIndex) =>
                                  candidateIndex === index ? { ...candidate, noteText: value } : candidate
                                ),
                                error: null
                              }
                            : current
                        )
                      }
                      placeholder="Optional"
                    />
                  </View>
                ) : null}
              </Card>
            ))}

            {customize.error ? (
              <AppText variant="meta" tone="danger">
                {customize.error}
              </AppText>
            ) : null}

            <PrimaryButton
              label="Save Custom Sets"
              onPress={() => {
                if (!customize || !entryBeingCustomized) {
                  return;
                }

                const setTargets: WorkoutSetTargetDto[] = [];

                for (const draft of customize.drafts) {
                  const repText = normalizeRepTargetText(draft.repTargetText);
                  if (!repText) {
                    setCustomize((current) =>
                      current ? { ...current, error: "Each set needs a rep target." } : current
                    );
                    return;
                  }

                  const weightLbs =
                    draft.weightText.trim().length > 0
                      ? parseWeightDraft({ weightText: draft.weightText, unitSystem: props.unitSystem })
                      : null;
                  if (draft.weightText.trim().length > 0 && weightLbs === null) {
                    setCustomize((current) =>
                      current ? { ...current, error: "One or more set weights are invalid." } : current
                    );
                    return;
                  }

                  const durationSeconds =
                    draft.durationSecondsText.trim().length > 0 ? parseIntDraft(draft.durationSecondsText) : null;
                  const distanceMeters =
                    draft.distanceMetersText.trim().length > 0 ? Number(draft.distanceMetersText) : null;
                  const rpe = draft.rpeText.trim().length > 0 ? Number(draft.rpeText) : null;

                  setTargets.push({
                    repTargetText: repText,
                    ...(weightLbs !== null ? { targetWeight: { value: weightLbs, unit: "lb" } } : {}),
                    ...(durationSeconds !== null ? { durationSeconds } : {}),
                    ...(distanceMeters !== null && Number.isFinite(distanceMeters) ? { distanceMeters } : {}),
                    ...(rpe !== null && Number.isFinite(rpe) ? { rpe } : {}),
                    ...(draft.noteText.trim() ? { note: draft.noteText.trim().replace(/\s+/g, " ") } : {})
                  });
                }

                applySetTargets(entryBeingCustomized.id, setTargets);
                setCustomize(null);
                setEdit((current) =>
                  current && current.entryId === entryBeingCustomized.id ? { ...current, mode: "by_set" } : current
                );
              }}
            />
          </ScrollView>
        ) : null}
      </ModalSheet>
    </Card>
  );
}

const styles = StyleSheet.create({
  cardContent: {
    gap: spacing.md
  },
  headerStack: {
    gap: spacing.sm,
    minWidth: 0
  },
  workoutActionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    alignItems: "center"
  },
  titleCol: {
    flex: 1,
    gap: 2,
    minWidth: 0
  },
  exerciseList: {
    gap: spacing.sm
  },
  exerciseBlock: {
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    backgroundColor: colors.surface,
    overflow: "hidden",
    minWidth: 0
  },
  exerciseContent: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.xs,
    minWidth: 0
  },
  exerciseName: {
    color: colors.textPrimary
  },
  exerciseSummary: {
    color: colors.textSecondary
  },
  exerciseActionRow: {
    flexDirection: "row",
    gap: spacing.sm,
    alignItems: "center"
  },
  actionsSheetContent: {
    paddingBottom: spacing.lg
  },
  actionsSheetBody: {
    gap: spacing.sm
  },
  confirmBlock: {
    gap: spacing.sm,
    paddingVertical: spacing.xs
  },
  confirmActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    alignItems: "center"
  },
  customModeActions: {
    flexDirection: "row",
    gap: spacing.sm,
    alignItems: "center"
  },
  customModeCard: {
    gap: spacing.sm
  },
  addMoreRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md
  },
  editSheetContent: {
    flex: 1,
    gap: spacing.md
  },
  editSheetBody: {
    gap: spacing.md
  },
  editIntroCard: {
    gap: 4
  },
  editFields: {
    gap: spacing.sm
  },
  editActionsRow: {
    flexDirection: "row",
    justifyContent: "flex-start"
  },
  customizeSheetContent: {
    flex: 1,
    gap: spacing.md
  },
  customizeScroll: {
    flex: 1
  },
  customizeScrollContent: {
    gap: spacing.md,
    paddingBottom: spacing.lg
  },
  customizeTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md
  },
  customizeSetActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm
  },
  setCard: {
    gap: spacing.sm
  },
  setInputs: {
    gap: spacing.sm
  }
});
