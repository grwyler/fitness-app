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

type EditMode = "simple" | "by_set";

type SimpleEditState =
  | {
      entryId: string;
      mode: EditMode;
      setsText: string;
      repsText: string;
      weightText: string;
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

function parseIntDraft(value: string) {
  if (!value.trim()) {
    return null;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
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
  onAddExercisePress: () => void;
  onChangeWorkout: (workout: ProgramWorkoutTemplateDto | null) => void;
}) {
  const workout = props.workout;
  const sortedExercises = useMemo(
    () => (workout ? normalizeWorkoutExercises(workout.exercises) : []),
    [workout]
  );

  const [edit, setEdit] = useState<SimpleEditState>(null);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [customize, setCustomize] = useState<CustomizeState>(null);

  const editingEntry = editingEntryId
    ? sortedExercises.find((entry) => entry.id === editingEntryId) ?? null
    : null;

  const entryBeingCustomized = customize
    ? sortedExercises.find((entry) => entry.id === customize.entryId) ?? null
    : null;

  function updateWorkout(next: ProgramWorkoutTemplateDto) {
    props.onChangeWorkout({
      ...next,
      exercises: normalizeWorkoutExercises(next.exercises)
    });
  }

  function handleRemoveWorkoutIfEmpty(next: ProgramWorkoutTemplateDto) {
    if (next.exercises.length === 0) {
      props.onChangeWorkout(null);
      setEdit(null);
      setCustomize(null);
      return;
    }

    updateWorkout(next);
  }

  function startEdit(entry: ProgramWorkoutExerciseDto) {
    const repText = formatRepTargetFromExercise(entry);
    const weightText = entry.targetWeight
      ? formatWeightShort({ weight: entry.targetWeight, unitSystem: props.unitSystem }).replace(
          /\s*(lb|kg)$/i,
          ""
        )
      : "";

    setEdit({
      entryId: entry.id,
      mode: entry.setTargets && entry.setTargets.length > 0 ? "by_set" : "simple",
      setsText: String(entry.targetSets),
      repsText: repText,
      weightText,
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

    const sets = parseIntDraft(edit.setsText);
    if (sets === null || sets < 1 || sets > 20) {
      setEdit((current) => (current ? { ...current, error: "Sets must be between 1 and 20." } : current));
      return;
    }

    const repDraft = parseRepTargetText(edit.repsText);
    if (!repDraft) {
      setEdit((current) =>
        current ? { ...current, error: "Reps must be something like 8, 8-12, AMRAP, or failure." } : current
      );
      return;
    }

    const derivedReps = repDraft.targetReps ?? entry.targetReps;
    const repRangeMin = repDraft.repRangeMin;
    const repRangeMax = repDraft.repRangeMax;

    const weightLbs =
      edit.weightText.trim().length > 0
        ? parseWeightDraft({ weightText: edit.weightText, unitSystem: props.unitSystem })
        : null;
    if (edit.weightText.trim().length > 0 && weightLbs === null) {
      setEdit((current) => (current ? { ...current, error: "Weight must be a valid number." } : current));
      return;
    }

    const notes = edit.notesText.trim().replace(/\s+/g, " ");

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
  }

  function removeEntry(entryId: string) {
    if (!workout) {
      return;
    }

    const nextWorkout: ProgramWorkoutTemplateDto = {
      ...workout,
      exercises: workout.exercises.filter((entry) => entry.id !== entryId)
    };
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

  return (
    <Card padding="md" variant="muted" contentStyle={styles.cardContent}>
      <View style={styles.headerRow}>
        <View style={styles.titleCol}>
          <AppText variant="bodyStrong">{`Day ${props.dayNumber}`}</AppText>
          <AppText variant="caption" tone="secondary">
            {isEmpty
              ? "Needs workout"
              : `${workout?.name || "Workout"} \u00b7 ${sortedExercises.length} exercise${
                  sortedExercises.length === 1 ? "" : "s"
                }`}
          </AppText>
        </View>
        {isEmpty ? (
          <Button
            label="Add exercise"
            onPress={props.onAddExercisePress}
            variant="primary"
            fullWidth={false}
            size="sm"
          />
        ) : null}
      </View>

      {isEmpty ? (
        null
      ) : (
        <View style={styles.exerciseList}>
          {sortedExercises.map((entry) => {
            const summary = formatExercisePrescriptionSummary({ exercise: entry, unitSystem: props.unitSystem });

            return (
              <View key={entry.id} style={styles.exerciseBlock}>
                <View style={styles.exerciseRow}>
                  <View style={styles.exerciseTextCol}>
                    <AppText variant="bodyStrong">{entry.exerciseName}</AppText>
                    <AppText variant="caption" tone="secondary">
                      {summary}
                    </AppText>
                  </View>
                  <View style={styles.exerciseActions}>
                    <Chip
                      label="Edit"
                      onPress={() => startEdit(entry)}
                    />
                    <Chip label="Remove" variant="danger" onPress={() => removeEntry(entry.id)} />
                  </View>
                </View>
              </View>
            );
          })}

          <View style={styles.addMoreRow}>
            <Button
              label="Add exercise"
              onPress={props.onAddExercisePress}
              variant="secondary"
              fullWidth={false}
              size="sm"
            />
          </View>
        </View>
      )}

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
            {edit.mode === "by_set" ? (
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
                <View style={styles.editRow}>
                  <Input
                    label="Sets"
                    keyboardType="number-pad"
                    containerStyle={styles.editorInput}
                    value={edit.setsText}
                    onChangeText={(value) =>
                      setEdit((current) => (current ? { ...current, setsText: value, error: null } : current))
                    }
                    placeholder="3"
                  />
                  <Input
                    label="Reps"
                    containerStyle={styles.editorInput}
                    value={edit.repsText}
                    onChangeText={(value) =>
                      setEdit((current) => (current ? { ...current, repsText: value, error: null } : current))
                    }
                    placeholder="8, 8-12, AMRAP..."
                  />
                </View>
                <View style={styles.editRow}>
                  <Input
                    label="Load (optional)"
                    keyboardType="decimal-pad"
                    containerStyle={styles.editorInput}
                    value={edit.weightText}
                    onChangeText={(value) =>
                      setEdit((current) => (current ? { ...current, weightText: value, error: null } : current))
                    }
                    placeholder={props.unitSystem === "metric" ? "60" : "135"}
                  />
                  <Input
                    label="Notes (optional)"
                    containerStyle={styles.editorInput}
                    value={edit.notesText}
                    onChangeText={(value) =>
                      setEdit((current) => (current ? { ...current, notesText: value, error: null } : current))
                    }
                    placeholder="Optional"
                  />
                </View>
                <View style={styles.editActionsRow}>
                  <Button
                    label="Customize by set"
                    onPress={() => openCustomize(editingEntry)}
                    variant="secondary"
                    fullWidth={false}
                    size="sm"
                  />
                </View>
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
  headerRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between"
  },
  titleCol: {
    flex: 1,
    gap: 2
  },
  exerciseList: {
    gap: spacing.sm
  },
  exerciseBlock: {
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    backgroundColor: colors.surface,
    overflow: "hidden"
  },
  exerciseRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.md
  },
  exerciseTextCol: {
    flex: 1,
    gap: 2
  },
  exerciseActions: {
    flexDirection: "row",
    gap: spacing.xs,
    alignItems: "center"
  },
  editorInput: {
    flex: 1
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
  editRow: {
    flexDirection: "row",
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
