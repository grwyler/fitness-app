import { useEffect, useMemo, useRef, useState } from "react";
import type { AddCustomWorkoutExerciseRequest, ExerciseCatalogItemDto } from "@fitness/shared";
import {
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
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

type FilterOption = {
  key: string;
  label: string;
  count: number;
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

function parseRepGoalDraft(value: string) {
  const raw = value.trim();
  if (!raw) {
    return null;
  }

  const normalized = raw.replace(/\s+/g, "");
  const rangeParts = normalized.split(/[-–]/);

  if (rangeParts.length === 1) {
    const reps = parseIntDraft(rangeParts[0] ?? "");
    if (reps === null) {
      return null;
    }

    return { repGoal: reps, repRangeMin: null as number | null, repRangeMax: null as number | null };
  }

  if (rangeParts.length !== 2) {
    return null;
  }

  const min = parseIntDraft(rangeParts[0] ?? "");
  const max = parseIntDraft(rangeParts[1] ?? "");
  if (min === null || max === null) {
    return null;
  }

  return { repGoal: min, repRangeMin: min, repRangeMax: max };
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

function normalizeFilterKey(value: string) {
  return value.trim().toLowerCase();
}

function buildTopFilterOptions(input: { values: Array<string | null | undefined>; limit: number }): FilterOption[] {
  const counts = new Map<string, { label: string; count: number }>();

  for (const rawValue of input.values) {
    const value = rawValue?.trim();
    if (!value) {
      continue;
    }

    const key = normalizeFilterKey(value);
    const existing = counts.get(key);
    if (existing) {
      existing.count++;
      continue;
    }
    counts.set(key, { label: value, count: 1 });
  }

  return Array.from(counts.entries())
    .map(([key, value]) => ({ key, label: value.label, count: value.count }))
    .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label))
    .slice(0, input.limit);
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
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [detailsExpanded, setDetailsExpanded] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState<string | null>(null);
  const [selectedEquipmentType, setSelectedEquipmentType] = useState<string | null>(null);
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
    setIsSearchFocused(false);
    setFiltersExpanded(false);
    setDetailsExpanded(false);
    setSelectedCategory(null);
    setSelectedMuscleGroup(null);
    setSelectedEquipmentType(null);
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
          targetRepsText:
            request.repRangeMin != null && request.repRangeMax != null && request.repRangeMax > request.repRangeMin
              ? `${request.repRangeMin}-${request.repRangeMax}`
              : String(request.targetReps),
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

  const categoryOptions = useMemo(
    () => buildTopFilterOptions({ values: props.exercises.map((exercise) => exercise.category), limit: 8 }),
    [props.exercises]
  );

  const muscleGroupOptions = useMemo(
    () => buildTopFilterOptions({ values: props.exercises.map((exercise) => exercise.primaryMuscleGroup), limit: 10 }),
    [props.exercises]
  );

  const equipmentOptions = useMemo(
    () => buildTopFilterOptions({ values: props.exercises.map((exercise) => exercise.equipmentType), limit: 8 }),
    [props.exercises]
  );

  const hasAnyFilter = Boolean(selectedCategory || selectedMuscleGroup || selectedEquipmentType);
  const isHeaderCompact = step === "select" && isSearchFocused;

  const filteredExercises = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return props.exercises.filter((exercise) => {
      if (selectedCategory && normalizeFilterKey(exercise.category) !== selectedCategory) {
        return false;
      }

      if (
        selectedMuscleGroup &&
        normalizeFilterKey(exercise.primaryMuscleGroup ?? "") !== selectedMuscleGroup
      ) {
        return false;
      }

      if (
        selectedEquipmentType &&
        normalizeFilterKey(exercise.equipmentType ?? "") !== selectedEquipmentType
      ) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      const haystack = `${exercise.name} ${exercise.category} ${exercise.primaryMuscleGroup ?? ""} ${
        exercise.equipmentType ?? ""
      }`.toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [props.exercises, searchQuery, selectedCategory, selectedEquipmentType, selectedMuscleGroup]);

  const activeExercise = selectedExercises[configureIndex] ?? null;
  const activeExerciseConfig = activeExercise ? configByExerciseId[activeExercise.id] ?? null : null;

  function clearFilters() {
    setSelectedCategory(null);
    setSelectedMuscleGroup(null);
    setSelectedEquipmentType(null);
  }

  function toggleFilter(current: string | null, nextKey: string, setter: (value: string | null) => void) {
    Keyboard.dismiss();
    setter(current === nextKey ? null : nextKey);
  }

  function toggleFiltersExpanded() {
    Keyboard.dismiss();
    setFiltersExpanded((current) => !current);
  }

  function toggleDetailsExpanded() {
    Keyboard.dismiss();
    setDetailsExpanded((current) => !current);
  }

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

    const repDraft = parseRepGoalDraft(activeExerciseConfig.targetRepsText);
    if (!repDraft) {
      return { ok: false, message: "Reps must be a number like 8 or a range like 8-12." };
    }

    const reps = repDraft.repGoal;
    const repRangeMin = repDraft.repRangeMin;
    const repRangeMax = repDraft.repRangeMax;

    if (reps < 1 || reps > 100) {
      return { ok: false, message: "Target reps must be between 1 and 100." };
    }

    if (repRangeMin !== null && repRangeMax !== null) {
      if (repRangeMin < 1 || repRangeMin > 100 || repRangeMax < 1 || repRangeMax > 100) {
        return { ok: false, message: "Rep ranges must be between 1 and 100." };
      }

      if (repRangeMax < repRangeMin) {
        return { ok: false, message: "Rep range max must be greater than or equal to min." };
      }
    }

    const weight = parseFloatDraft(activeExerciseConfig.targetWeightText);
    if (weight !== null && (weight < 0 || weight > 2000)) {
      return { ok: false, message: "Weight must be between 0 and 2000." };
    }

    if (!activeExercise.isWeightOptional && (weight === null || weight === undefined)) {
      return { ok: false, message: "Weight is required for this exercise." };
    }

    return { ok: true as const, sets, reps, repRangeMin, repRangeMax, weight };
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
      const repDraft = parseRepGoalDraft(config.targetRepsText);
      const reps = repDraft?.repGoal ?? CUSTOM_WORKOUT_DEFAULT_TARGET_REPS;
      const repRangeMin = repDraft?.repRangeMin ?? null;
      const repRangeMax = repDraft?.repRangeMax ?? null;
      const weight = parseFloatDraft(config.targetWeightText);

      return {
        exerciseId: exercise.id,
        targetSets: sets,
        targetReps: reps,
        ...(repRangeMin !== null && repRangeMax !== null && repRangeMax > repRangeMin
          ? { repRangeMin, repRangeMax }
          : {}),
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
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={[styles.modalSheet, isHeaderCompact && styles.modalSheetCompact]}
        >
          <View style={styles.modalHeader}>
            <View style={styles.modalTitleGroup}>
              <Text style={styles.cardLabel}>Custom workout</Text>
              <Text style={[styles.modalTitle, step === "select" && styles.modalTitleSelect]}>
                {step === "select" ? "Choose exercises" : "Configure exercise"}
              </Text>
              {step === "configure" && activeExercise ? (
                <Text style={styles.cardBody}>
                  {configureIndex + 1} of {selectedExercises.length}: {activeExercise.name}
                </Text>
              ) : null}
            </View>
            <Pressable accessibilityRole="button" onPress={props.onClose} style={styles.closeButton}>
              <Text style={styles.closeLabel}>Close</Text>
            </Pressable>
          </View>

          {step === "select" ? (
            <>
              <FlatList
                data={props.loadingExercises ? [] : filteredExercises}
                keyExtractor={(exercise) => exercise.id}
                keyboardDismissMode="on-drag"
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.exerciseChoiceList}
                style={styles.exerciseList}
                ListHeaderComponent={
                  <View style={styles.listHeader}>
                    {!isHeaderCompact ? (
                      <View style={styles.detailsRow}>
                        <Pressable accessibilityRole="button" onPress={toggleDetailsExpanded} style={styles.detailsToggle}>
                          <Text style={styles.detailsToggleText}>
                            {detailsExpanded ? "Hide details" : "Workout details"}
                          </Text>
                        </Pressable>
                      </View>
                    ) : null}

                    {detailsExpanded && !isHeaderCompact ? (
                      <View style={styles.detailsPanel}>
                        <Text style={styles.cardBody}>
                          Pick exercises, then set sets/reps/weight before adding them.
                        </Text>
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
                    ) : null}

                    <View style={styles.inputGroup}>
                      <View style={styles.searchHeaderRow}>
                        <Text style={styles.inputLabel}>Search</Text>
                        <Pressable
                          accessibilityRole="button"
                          onPress={toggleFiltersExpanded}
                          style={styles.filtersToggle}
                        >
                          <Text style={styles.filtersToggleText}>
                            {filtersExpanded ? "Hide filters" : hasAnyFilter ? "Filters (on)" : "Filters"}
                          </Text>
                        </Pressable>
                      </View>
                      <TextInput
                        autoCapitalize="none"
                        autoCorrect={false}
                        onChangeText={setSearchQuery}
                        onFocus={() => setIsSearchFocused(true)}
                        onBlur={() => setIsSearchFocused(false)}
                        placeholder="Bench press, curl, cable..."
                        placeholderTextColor={colors.textSecondary}
                        style={styles.input}
                        value={searchQuery}
                      />
                    </View>

                    {filtersExpanded ? (
                      <View style={styles.filterSection}>
                        <ScrollView
                          horizontal
                          keyboardShouldPersistTaps="handled"
                          showsHorizontalScrollIndicator={false}
                          contentContainerStyle={styles.filterRow}
                        >
                          <Text style={styles.filterRowLabel}>Category</Text>
                          {categoryOptions.map((option) => (
                            <Pressable
                              accessibilityRole="button"
                              key={`category:${option.key}`}
                              onPress={() => toggleFilter(selectedCategory, option.key, setSelectedCategory)}
                              style={[
                                styles.filterChip,
                                selectedCategory === option.key && styles.filterChipSelected
                              ]}
                            >
                              <Text
                                style={[
                                  styles.filterChipText,
                                  selectedCategory === option.key && styles.filterChipTextSelected
                                ]}
                              >
                                {option.label}
                              </Text>
                            </Pressable>
                          ))}
                        </ScrollView>

                        <ScrollView
                          horizontal
                          keyboardShouldPersistTaps="handled"
                          showsHorizontalScrollIndicator={false}
                          contentContainerStyle={styles.filterRow}
                        >
                          <Text style={styles.filterRowLabel}>Muscle</Text>
                          {muscleGroupOptions.map((option) => (
                            <Pressable
                              accessibilityRole="button"
                              key={`muscle:${option.key}`}
                              onPress={() => toggleFilter(selectedMuscleGroup, option.key, setSelectedMuscleGroup)}
                              style={[
                                styles.filterChip,
                                selectedMuscleGroup === option.key && styles.filterChipSelected
                              ]}
                            >
                              <Text
                                style={[
                                  styles.filterChipText,
                                  selectedMuscleGroup === option.key && styles.filterChipTextSelected
                                ]}
                              >
                                {option.label}
                              </Text>
                            </Pressable>
                          ))}
                        </ScrollView>

                        <ScrollView
                          horizontal
                          keyboardShouldPersistTaps="handled"
                          showsHorizontalScrollIndicator={false}
                          contentContainerStyle={styles.filterRow}
                        >
                          <Text style={styles.filterRowLabel}>Equipment</Text>
                          {equipmentOptions.map((option) => (
                            <Pressable
                              accessibilityRole="button"
                              key={`equipment:${option.key}`}
                              onPress={() => toggleFilter(selectedEquipmentType, option.key, setSelectedEquipmentType)}
                              style={[
                                styles.filterChip,
                                selectedEquipmentType === option.key && styles.filterChipSelected
                              ]}
                            >
                              <Text
                                style={[
                                  styles.filterChipText,
                                  selectedEquipmentType === option.key && styles.filterChipTextSelected
                                ]}
                              >
                                {option.label}
                              </Text>
                            </Pressable>
                          ))}

                          {hasAnyFilter ? (
                            <Pressable accessibilityRole="button" onPress={clearFilters} style={styles.clearChip}>
                              <Text style={styles.clearChipText}>Clear</Text>
                            </Pressable>
                          ) : null}
                        </ScrollView>
                      </View>
                    ) : null}
                  </View>
                }
                ListEmptyComponent={
                  props.loadingExercises ? (
                    <Text style={styles.cardBody}>Loading exercises...</Text>
                  ) : (
                    <Text style={styles.cardBody}>
                      {hasAnyFilter || searchQuery.trim()
                        ? "No exercises match your search."
                        : "No exercises available."}
                    </Text>
                  )
                }
                renderItem={({ item: exercise }) => {
                  const isSelected = selectedExerciseIdSet.has(exercise.id);
                  return (
                    <Pressable
                      accessibilityRole="button"
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
                }}
              />

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
                    <Text style={styles.inputLabel}>Reps (e.g. 8 or 8-12)</Text>
                    <TextInput
                      keyboardType={Platform.OS === "ios" ? "numbers-and-punctuation" : "default"}
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
        </KeyboardAvoidingView>
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
    flex: 1,
    maxHeight: "92%",
    maxWidth: 620,
    padding: spacing.lg,
    width: "100%"
  },
  modalSheetCompact: {
    gap: spacing.sm,
    padding: spacing.md
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
  modalTitleSelect: {
    fontSize: 20
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
  searchHeaderRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  filtersToggle: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 6
  },
  filtersToggleText: {
    color: colors.accentStrong,
    fontSize: 14,
    fontWeight: "700"
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
  exerciseList: {
    flex: 1
  },
  listHeader: {
    gap: spacing.sm,
    paddingBottom: spacing.xs
  },
  detailsRow: {
    alignItems: "flex-start"
  },
  detailsToggle: {
    paddingVertical: 4
  },
  detailsToggleText: {
    color: colors.accentStrong,
    fontSize: 14,
    fontWeight: "700"
  },
  detailsPanel: {
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md
  },
  filterSection: {
    gap: spacing.xs
  },
  filterRow: {
    alignItems: "center",
    gap: spacing.xs,
    paddingVertical: 2
  },
  filterRowLabel: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: "700",
    marginRight: spacing.xs,
    textTransform: "uppercase"
  },
  filterChip: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6
  },
  filterChipSelected: {
    backgroundColor: colors.accentMuted,
    borderColor: colors.accentStrong
  },
  filterChipText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: "700",
    textTransform: "capitalize"
  },
  filterChipTextSelected: {
    color: colors.accentStrong
  },
  clearChip: {
    backgroundColor: "transparent",
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6
  },
  clearChipText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: "700"
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
