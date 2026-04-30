import { useEffect, useMemo, useRef, useState } from "react";
import type { AddCustomWorkoutExerciseRequest, ExerciseCatalogItemDto } from "@fitness/shared";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { PrimaryButton } from "../../../components/PrimaryButton";
import { colors, spacing } from "../../../theme/tokens";
import {
  CUSTOM_WORKOUT_DEFAULT_TARGET_REPS,
  CUSTOM_WORKOUT_DEFAULT_TARGET_SETS
} from "../hooks/useCustomWorkoutExercises";
import {
  getCustomExercisePickerActionLabel,
  type CustomWorkoutBuilderMode
} from "../utils/custom-workout-builder.shared";

type Step = "select" | "configure";

type ExerciseConfigDraft = {
  targetSetsText: string;
  targetRepsText: string;
  targetWeightText: string;
};

function parseIntDraft(value: string) {
  if (!value.trim()) {
    return null;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseFloatDraft(value: string) {
  if (!value.trim()) {
    return null;
  }

  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function buildDefaultConfig(exercise: ExerciseCatalogItemDto): ExerciseConfigDraft {
  const sets = exercise.defaultTargetSets ?? CUSTOM_WORKOUT_DEFAULT_TARGET_SETS;
  const reps = exercise.defaultTargetReps ?? CUSTOM_WORKOUT_DEFAULT_TARGET_REPS;
  const weight = exercise.defaultStartingWeight.value;

  return {
    targetSetsText: String(sets),
    targetRepsText: String(reps),
    targetWeightText: exercise.isWeightOptional && weight === 0 ? "" : String(weight)
  };
}

function buildExerciseMeta(exercise: ExerciseCatalogItemDto) {
  return [exercise.category, exercise.primaryMuscleGroup, exercise.equipmentType].filter(Boolean).join(" - ");
}

export function CustomExercisePickerModal(props: {
  errorMessage: string | null;
  exercises: ExerciseCatalogItemDto[];
  loadingExercises: boolean;
  initialRequests?: AddCustomWorkoutExerciseRequest[] | null;
  initializationKey?: string | number;
  mode: CustomWorkoutBuilderMode;
  programDayNumber?: number | null;
  workoutName?: string;
  submitting: boolean;
  visible: boolean;
  onChangeWorkoutName?: (value: string) => void;
  onClose: () => void;
  onSubmit: (input: { requests: AddCustomWorkoutExerciseRequest[] }) => void;
}) {
  const [step, setStep] = useState<Step>("select");
  const [validationError, setValidationError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedExerciseIds, setSelectedExerciseIds] = useState<string[]>([]);
  const [configureIndex, setConfigureIndex] = useState(0);
  const [configByExerciseId, setConfigByExerciseId] = useState<Record<string, ExerciseConfigDraft>>({});
  const pendingInitialRequestsRef = useRef<AddCustomWorkoutExerciseRequest[] | null>(null);

  useEffect(() => {
    if (!props.visible) {
      return;
    }

    setStep("select");
    setSearchQuery("");
    setSelectedExerciseIds([]);
    setConfigureIndex(0);
    setConfigByExerciseId({});
    setValidationError(null);

    const initialRequests = props.initialRequests?.length ? props.initialRequests : null;
    pendingInitialRequestsRef.current = initialRequests;
    if (initialRequests) {
      setSelectedExerciseIds(initialRequests.map((request) => request.exerciseId));
    }
  }, [props.visible, props.initializationKey]);

  useEffect(() => {
    if (!props.visible) {
      return;
    }

    const pending = pendingInitialRequestsRef.current;
    if (!pending || pending.length === 0) {
      return;
    }

    setConfigByExerciseId((current) => {
      let didChange = false;
      const next = { ...current };
      const remaining: AddCustomWorkoutExerciseRequest[] = [];

      for (const request of pending) {
        const exercise = props.exercises.find((candidate) => candidate.id === request.exerciseId);
        if (!exercise) {
          remaining.push(request);
          continue;
        }

        const defaults = buildDefaultConfig(exercise);
        next[exercise.id] = {
          ...defaults,
          targetSetsText: String(request.targetSets),
          targetRepsText: String(request.targetReps),
          ...(request.targetWeight ? { targetWeightText: String(request.targetWeight.value) } : {})
        };
        didChange = true;
      }

      pendingInitialRequestsRef.current = remaining.length > 0 ? remaining : null;
      return didChange ? next : current;
    });
  }, [props.exercises, props.visible]);

  const selectedExerciseIdSet = useMemo(() => new Set(selectedExerciseIds), [selectedExerciseIds]);
  const selectedExercises = useMemo(
    () => selectedExerciseIds.map((exerciseId) => props.exercises.find((exercise) => exercise.id === exerciseId)).filter(Boolean),
    [props.exercises, selectedExerciseIds]
  ) as ExerciseCatalogItemDto[];

  const filteredExercises = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    if (!normalizedQuery) {
      return props.exercises;
    }

    return props.exercises.filter((exercise) => {
      const haystack = `${exercise.name} ${exercise.category} ${exercise.primaryMuscleGroup ?? ""} ${
        exercise.equipmentType ?? ""
      }`.toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [props.exercises, searchQuery]);

  const activeExercise = selectedExercises[configureIndex] ?? null;
  const activeExerciseConfig = activeExercise ? configByExerciseId[activeExercise.id] ?? null : null;

  function handleToggleExercise(exerciseId: string) {
    setValidationError(null);
    setSelectedExerciseIds((current) =>
      current.includes(exerciseId)
        ? current.filter((selectedExerciseId) => selectedExerciseId !== exerciseId)
        : [...current, exerciseId]
    );
  }

  function moveToConfigureStep() {
    setValidationError(null);
    const selected = selectedExerciseIds
      .map((exerciseId) => props.exercises.find((exercise) => exercise.id === exerciseId))
      .filter(Boolean) as ExerciseCatalogItemDto[];

    if (selected.length === 0) {
      return;
    }

    setConfigByExerciseId((current) => {
      const next = { ...current };
      for (const exercise of selected) {
        if (!next[exercise.id]) {
          next[exercise.id] = buildDefaultConfig(exercise);
        }
      }
      return next;
    });
    setConfigureIndex(0);
    setStep("configure");
  }

  function validateActiveExerciseConfig() {
    if (!activeExercise || !activeExerciseConfig) {
      return { ok: false, message: "Choose an exercise to continue." };
    }

    const sets = parseIntDraft(activeExerciseConfig.targetSetsText);
    if (sets === null || sets < 1 || sets > 20) {
      return { ok: false, message: "Sets must be between 1 and 20." };
    }

    const reps = parseIntDraft(activeExerciseConfig.targetRepsText);
    if (reps === null || reps < 1 || reps > 100) {
      return { ok: false, message: "Target reps must be between 1 and 100." };
    }

    const weight = parseFloatDraft(activeExerciseConfig.targetWeightText);
    if (weight !== null && (weight < 0 || weight > 2000)) {
      return { ok: false, message: "Weight must be between 0 and 2000." };
    }

    if (!activeExercise.isWeightOptional && (weight === null || weight === undefined)) {
      return { ok: false, message: "Weight is required for this exercise." };
    }

    return { ok: true as const, sets, reps, weight };
  }

  function updateActiveConfig(patch: Partial<ExerciseConfigDraft>) {
    if (!activeExercise) {
      return;
    }

    setValidationError(null);
    setConfigByExerciseId((current) => ({
      ...current,
      [activeExercise.id]: {
        ...(current[activeExercise.id] ?? buildDefaultConfig(activeExercise)),
        ...patch
      }
    }));
  }

  function handleNextConfigure() {
    const validation = validateActiveExerciseConfig();
    if (!validation.ok) {
      setValidationError(validation.message);
      return;
    }

    setValidationError(null);
    const isLast = configureIndex >= selectedExercises.length - 1;
    if (!isLast) {
      setConfigureIndex((current) => Math.min(selectedExercises.length - 1, current + 1));
      return;
    }

    const requests: AddCustomWorkoutExerciseRequest[] = selectedExercises.map((exercise) => {
      const config = configByExerciseId[exercise.id] ?? buildDefaultConfig(exercise);
      const sets = parseIntDraft(config.targetSetsText) ?? CUSTOM_WORKOUT_DEFAULT_TARGET_SETS;
      const reps = parseIntDraft(config.targetRepsText) ?? CUSTOM_WORKOUT_DEFAULT_TARGET_REPS;
      const weight = parseFloatDraft(config.targetWeightText);

      return {
        exerciseId: exercise.id,
        targetSets: sets,
        targetReps: reps,
        ...(weight !== null ? { targetWeight: { value: weight, unit: "lb" } } : {})
      };
    });

    props.onSubmit({ requests });
  }

  const actionLabel = getCustomExercisePickerActionLabel({
    selectedExerciseCount: selectedExerciseIds.length,
    mode: props.mode,
    programDayNumber: props.programDayNumber
  });

  return (
    <Modal animationType="slide" transparent visible={props.visible} onRequestClose={props.onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalSheet}>
          <View style={styles.modalHeader}>
            <View style={styles.modalTitleGroup}>
              <Text style={styles.cardLabel}>Custom workout</Text>
              <Text style={styles.modalTitle}>
                {step === "select" ? "Choose exercises" : "Configure exercise"}
              </Text>
              {step === "select" ? (
                <Text style={styles.cardBody}>
                  Pick exercises, then set sets/reps/weight before adding them.
                </Text>
              ) : activeExercise ? (
                <Text style={styles.cardBody}>
                  {configureIndex + 1} of {selectedExercises.length}: {activeExercise.name}
                </Text>
              ) : null}
              {props.mode === "assignToProgramDay" ? (
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Workout name</Text>
                  <TextInput
                    autoCapitalize="words"
                    onChangeText={props.onChangeWorkoutName}
                    placeholder="Optional"
                    placeholderTextColor={colors.textSecondary}
                    style={styles.input}
                    value={props.workoutName ?? ""}
                  />
                </View>
              ) : null}
            </View>
            <Pressable accessibilityRole="button" onPress={props.onClose} style={styles.closeButton}>
              <Text style={styles.closeLabel}>Close</Text>
            </Pressable>
          </View>

          {step === "select" ? (
            <>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Search</Text>
                <TextInput
                  autoCapitalize="none"
                  autoCorrect={false}
                  onChangeText={setSearchQuery}
                  placeholder="Bench press, curl, cable..."
                  placeholderTextColor={colors.textSecondary}
                  style={styles.input}
                  value={searchQuery}
                />
              </View>
              <ScrollView contentContainerStyle={styles.exerciseChoiceList}>
                {props.loadingExercises ? (
                  <Text style={styles.cardBody}>Loading exercises...</Text>
                ) : filteredExercises.length === 0 ? (
                  <Text style={styles.cardBody}>No exercises match your search.</Text>
                ) : (
                  filteredExercises.map((exercise) => {
                    const isSelected = selectedExerciseIdSet.has(exercise.id);
                    return (
                      <Pressable
                        accessibilityRole="button"
                        key={exercise.id}
                        onPress={() => handleToggleExercise(exercise.id)}
                        style={[styles.exerciseChoice, isSelected && styles.selectedExerciseChoice]}
                      >
                        <View style={styles.exerciseChoiceText}>
                          <Text style={styles.exerciseName}>{exercise.name}</Text>
                          <Text style={styles.exerciseMeta}>{buildExerciseMeta(exercise)}</Text>
                        </View>
                        <Text style={[styles.selectState, isSelected && styles.selectedState]}>
                          {isSelected ? "Selected" : "Add"}
                        </Text>
                      </Pressable>
                    );
                  })
                )}
              </ScrollView>

              {props.errorMessage ? <Text style={styles.errorText}>{props.errorMessage}</Text> : null}
              {validationError ? <Text style={styles.errorText}>{validationError}</Text> : null}
              <PrimaryButton
                label={actionLabel}
                disabled={
                  props.submitting ||
                  props.loadingExercises ||
                  selectedExerciseIds.length === 0
                }
                loading={props.submitting}
                onPress={moveToConfigureStep}
              />
            </>
          ) : activeExercise && activeExerciseConfig ? (
            <>
              <View style={styles.configureCard}>
                <Text style={styles.configureTitle}>{activeExercise.name}</Text>
                <Text style={styles.cardBody}>{buildExerciseMeta(activeExercise)}</Text>
                <View style={styles.configureInputs}>
                  <View style={styles.inlineInputGroup}>
                    <Text style={styles.inputLabel}>Sets</Text>
                    <TextInput
                      keyboardType="number-pad"
                      onChangeText={(value) => updateActiveConfig({ targetSetsText: value })}
                      placeholder="3"
                      placeholderTextColor={colors.textSecondary}
                      style={styles.input}
                      value={activeExerciseConfig.targetSetsText}
                    />
                  </View>
                  <View style={styles.inlineInputGroup}>
                    <Text style={styles.inputLabel}>Target reps</Text>
                    <TextInput
                      keyboardType="number-pad"
                      onChangeText={(value) => updateActiveConfig({ targetRepsText: value })}
                      placeholder="8"
                      placeholderTextColor={colors.textSecondary}
                      style={styles.input}
                      value={activeExerciseConfig.targetRepsText}
                    />
                  </View>
                  <View style={styles.inlineInputGroup}>
                    <Text style={styles.inputLabel}>{activeExercise.isWeightOptional ? "Weight (lb, optional)" : "Weight (lb)"}</Text>
                    <TextInput
                      keyboardType="decimal-pad"
                      onChangeText={(value) => updateActiveConfig({ targetWeightText: value })}
                      placeholder={activeExercise.isWeightOptional ? "Optional" : "135"}
                      placeholderTextColor={colors.textSecondary}
                      style={styles.input}
                      value={activeExerciseConfig.targetWeightText}
                    />
                  </View>
                </View>
              </View>

              {props.errorMessage ? <Text style={styles.errorText}>{props.errorMessage}</Text> : null}
              {validationError ? <Text style={styles.errorText}>{validationError}</Text> : null}
              <View style={styles.configureActions}>
                <PrimaryButton
                  label={configureIndex === 0 ? "Back" : "Previous"}
                  tone="secondary"
                  onPress={() => {
                    if (configureIndex === 0) {
                      setValidationError(null);
                      setStep("select");
                      return;
                    }
                    setValidationError(null);
                    setConfigureIndex((current) => Math.max(0, current - 1));
                  }}
                  disabled={props.submitting}
                />
                <PrimaryButton
                  label={configureIndex >= selectedExercises.length - 1 ? "Add exercises" : "Next"}
                  onPress={handleNextConfigure}
                  disabled={props.submitting}
                  loading={props.submitting}
                />
              </View>
            </>
          ) : (
            <Text style={styles.cardBody}>Choose an exercise to continue.</Text>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: {
    alignItems: "center",
    backgroundColor: "rgba(17, 24, 39, 0.46)",
    flex: 1,
    justifyContent: "flex-end",
    padding: spacing.md
  },
  modalSheet: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    gap: spacing.md,
    maxHeight: "92%",
    maxWidth: 620,
    padding: spacing.lg,
    width: "100%"
  },
  modalHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between"
  },
  modalTitleGroup: {
    flex: 1,
    gap: spacing.xs
  },
  cardLabel: {
    color: colors.accentStrong,
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase"
  },
  modalTitle: {
    color: colors.textPrimary,
    fontSize: 24,
    fontWeight: "600"
  },
  cardBody: {
    color: colors.textSecondary,
    fontSize: 16,
    lineHeight: 22
  },
  inputGroup: {
    gap: spacing.xs,
    marginTop: spacing.xs
  },
  inlineInputGroup: {
    gap: spacing.xs
  },
  inputLabel: {
    color: colors.accentStrong,
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase"
  },
  input: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: "600",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  closeButton: {
    paddingVertical: spacing.xs
  },
  closeLabel: {
    color: colors.accentStrong,
    fontSize: 15,
    fontWeight: "600"
  },
  exerciseChoiceList: {
    gap: spacing.sm
  },
  exerciseChoice: {
    alignItems: "center",
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
    padding: spacing.md
  },
  selectedExerciseChoice: {
    borderColor: colors.accentStrong,
    borderWidth: 2
  },
  exerciseChoiceText: {
    flex: 1,
    gap: 4
  },
  exerciseName: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: "600",
    lineHeight: 22
  },
  exerciseMeta: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 20,
    textTransform: "capitalize"
  },
  selectState: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: "600"
  },
  selectedState: {
    color: colors.accentStrong
  },
  configureCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md
  },
  configureTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: "700"
  },
  configureInputs: {
    gap: spacing.sm
  },
  configureActions: {
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between"
  },
  errorText: {
    color: colors.danger,
    fontSize: 14,
    fontWeight: "600"
  }
});
