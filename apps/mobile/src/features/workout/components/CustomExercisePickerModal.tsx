import { useEffect, useMemo, useRef, useState } from "react";
import type { AddCustomWorkoutExerciseRequest, ExerciseCatalogItemDto, ProgressionStrategy } from "@fitness/shared";
import { progressionStrategies } from "@fitness/shared";
import {
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View
} from "react-native";
import { AppText } from "../../../components/AppText";
import { Button } from "../../../components/Button";
import { Card } from "../../../components/Card";
import { Chip } from "../../../components/Chip";
import { EmptyState } from "../../../components/EmptyState";
import { Input } from "../../../components/Input";
import { ListRow } from "../../../components/ListRow";
import { ModalSheet } from "../../../components/ModalSheet";
import { PrimaryButton } from "../../../components/PrimaryButton";
import { borderWidths, colors, spacing } from "../../../theme/tokens";
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
  progressionStrategy: ProgressionStrategy;
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
  const progressionStrategy: ProgressionStrategy = (() => {
    if (!exercise.isProgressionEligible) {
      return "no_progression";
    }

    if (exercise.isBodyweight) {
      return exercise.isWeightOptional ? "bodyweight_weighted" : "bodyweight_reps";
    }

    return "double_progression";
  })();

  return {
    targetSetsText: String(sets),
    targetRepsText: String(reps),
    targetWeightText: exercise.isWeightOptional && weight === 0 ? "" : String(weight),
    progressionStrategy
  };
}

function buildExerciseMeta(exercise: ExerciseCatalogItemDto) {
  return [exercise.category, exercise.primaryMuscleGroup, exercise.equipmentType].filter(Boolean).join(" - ");
}

function getAvailableProgressionStrategies(exercise: ExerciseCatalogItemDto): ProgressionStrategy[] {
  if (!exercise.isProgressionEligible) {
    return ["no_progression"];
  }

  if (exercise.isBodyweight) {
    return exercise.isWeightOptional
      ? ["bodyweight_reps", "bodyweight_weighted", "no_progression"]
      : ["bodyweight_reps", "no_progression"];
  }

  return ["double_progression", "fixed_weight", "no_progression"];
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
          ...(request.progressionStrategy &&
          (progressionStrategies as readonly string[]).includes(request.progressionStrategy)
            ? { progressionStrategy: request.progressionStrategy }
            : {}),
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

    const strategy = activeExerciseConfig.progressionStrategy;
    if (!(progressionStrategies as readonly string[]).includes(strategy)) {
      return { ok: false, message: "Choose a valid progression strategy." };
    }

    return { ok: true as const, sets, reps, repRangeMin, repRangeMax, weight, strategy };
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
        ...(weight !== null ? { targetWeight: { value: weight, unit: "lb" } } : {}),
        progressionStrategy: config.progressionStrategy
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
    <ModalSheet
      visible={props.visible}
      onClose={props.onClose}
      title={step === "select" ? "Choose exercises" : "Configure exercise"}
      subtitle={
        step === "configure" && activeExercise
          ? `${configureIndex + 1} of ${selectedExercises.length}: ${activeExercise.name}`
          : "Custom workout"
      }
      headerRight={<PrimaryButton label="Close" onPress={props.onClose} variant="ghost" fullWidth={false} size="sm" />}
      style={isHeaderCompact ? styles.sheetCompact : undefined}
      contentStyle={styles.sheetContent}
    >
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.flex}>

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
                        <Button
                          label={detailsExpanded ? "Hide details" : "Workout details"}
                          onPress={toggleDetailsExpanded}
                          variant="ghost"
                          fullWidth={false}
                          size="sm"
                        />
                      </View>
                    ) : null}

                    {detailsExpanded && !isHeaderCompact ? (
                      <Card variant="muted" padding="md" contentStyle={styles.detailsCardContent}>
                        <AppText tone="secondary">
                          Pick exercises, then set sets/reps/weight before adding them.
                        </AppText>
                        {props.mode === "assignToProgramDay" ? (
                          <View style={styles.inputGroup}>
                            <Input
                              autoCapitalize="words"
                              onChangeText={props.onChangeWorkoutName}
                              placeholder="Optional"
                              value={props.workoutName ?? ""}
                            />
                          </View>
                        ) : null}
                      </Card>
                    ) : null}

                    <View style={styles.inputGroup}>
                      <View style={styles.searchHeaderRow}>
                        <AppText variant="caption" tone="secondary">
                          Exercises
                        </AppText>
                        <Button
                          label={filtersExpanded ? "Hide filters" : hasAnyFilter ? "Filters (on)" : "Filters"}
                          onPress={toggleFiltersExpanded}
                          variant="ghost"
                          fullWidth={false}
                          size="sm"
                        />
                      </View>
                      <Input
                        autoCapitalize="none"
                        autoCorrect={false}
                        onChangeText={setSearchQuery}
                        onFocus={() => setIsSearchFocused(true)}
                        onBlur={() => setIsSearchFocused(false)}
                        placeholder="Bench press, curl, cable..."
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
                          <AppText variant="caption" tone="secondary">
                            Category
                          </AppText>
                          {categoryOptions.map((option) => (
                            <Chip
                              key={`category:${option.key}`}
                              label={option.label}
                              selected={selectedCategory === option.key}
                              onPress={() => toggleFilter(selectedCategory, option.key, setSelectedCategory)}
                            />
                          ))}
                        </ScrollView>

                        <ScrollView
                          horizontal
                          keyboardShouldPersistTaps="handled"
                          showsHorizontalScrollIndicator={false}
                          contentContainerStyle={styles.filterRow}
                        >
                          <AppText variant="caption" tone="secondary">
                            Muscle
                          </AppText>
                          {muscleGroupOptions.map((option) => (
                            <Chip
                              key={`muscle:${option.key}`}
                              label={option.label}
                              selected={selectedMuscleGroup === option.key}
                              onPress={() => toggleFilter(selectedMuscleGroup, option.key, setSelectedMuscleGroup)}
                            />
                          ))}
                        </ScrollView>

                        <ScrollView
                          horizontal
                          keyboardShouldPersistTaps="handled"
                          showsHorizontalScrollIndicator={false}
                          contentContainerStyle={styles.filterRow}
                        >
                          <AppText variant="caption" tone="secondary">
                            Equipment
                          </AppText>
                          {equipmentOptions.map((option) => (
                            <Chip
                              key={`equipment:${option.key}`}
                              label={option.label}
                              selected={selectedEquipmentType === option.key}
                              onPress={() => toggleFilter(selectedEquipmentType, option.key, setSelectedEquipmentType)}
                            />
                          ))}

                          {hasAnyFilter ? (
                            <Button label="Clear" onPress={clearFilters} variant="ghost" fullWidth={false} size="sm" />
                          ) : null}
                        </ScrollView>
                      </View>
                    ) : null}
                  </View>
                }
                ListEmptyComponent={
                  props.loadingExercises ? (
                    <AppText tone="secondary">Loading exercises...</AppText>
                  ) : (
                    <EmptyState
                      title={hasAnyFilter || searchQuery.trim() ? "No matches" : "No exercises"}
                      message={
                        hasAnyFilter || searchQuery.trim()
                          ? "No exercises match your search."
                          : "No exercises are available yet."
                      }
                    />
                  )
                }
                renderItem={({ item: exercise }) => {
                  const isSelected = selectedExerciseIdSet.has(exercise.id);
                  return (
                    <ListRow
                      title={exercise.name}
                      subtitle={buildExerciseMeta(exercise)}
                      onPress={() => handleToggleExercise(exercise.id)}
                      style={isSelected ? styles.selectedExerciseChoice : undefined}
                      right={
                        <AppText variant="caption" tone={isSelected ? "accent" : "tertiary"}>
                          {isSelected ? "Selected" : "Add"}
                        </AppText>
                      }
                    />
                  );
                }}
              />

              {props.errorMessage ? <AppText variant="error">{props.errorMessage}</AppText> : null}
              {validationError ? <AppText variant="error">{validationError}</AppText> : null}
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
            <ScrollView
              style={styles.configureScroll}
              contentContainerStyle={styles.configureScrollContent}
              keyboardDismissMode="on-drag"
              keyboardShouldPersistTaps="handled"
            >
              <Card variant="elevated" padding="md" contentStyle={styles.configureCardContent}>
                <AppText variant="cardTitle">{activeExercise.name}</AppText>
                <AppText tone="secondary">{buildExerciseMeta(activeExercise)}</AppText>
                <View style={styles.configureInputs}>
                  <Input
                    label="Sets"
                    keyboardType="number-pad"
                    value={activeExerciseConfig.targetSetsText}
                    onChangeText={(value) => updateActiveConfig({ targetSetsText: value })}
                    placeholder="3"
                  />
                  <Input
                    label="Reps (e.g. 8 or 8-12)"
                    keyboardType={Platform.OS === "ios" ? "numbers-and-punctuation" : "default"}
                    value={activeExerciseConfig.targetRepsText}
                    onChangeText={(value) => updateActiveConfig({ targetRepsText: value })}
                    placeholder="8"
                  />
                  <Input
                    label={activeExercise.isWeightOptional ? "Weight (lb, optional)" : "Weight (lb)"}
                    keyboardType="decimal-pad"
                    value={activeExerciseConfig.targetWeightText}
                    onChangeText={(value) => updateActiveConfig({ targetWeightText: value })}
                    placeholder={activeExercise.isWeightOptional ? "Optional" : "135"}
                  />
                  <View style={styles.inlineInputGroup}>
                    <AppText variant="sectionLabel" tone="secondary">
                      Progression method
                    </AppText>
                    <AppText variant="caption" tone="tertiary">
                      Sets how we recommend increases for this exercise.
                    </AppText>
                    {!activeExercise.isProgressionEligible ? (
                      <AppText variant="caption" tone="tertiary">
                        Progression recommendations are off for this exercise.
                      </AppText>
                    ) : null}
                    <View style={styles.strategyList}>
                      {getAvailableProgressionStrategies(activeExercise).map((strategy) => {
                        const selected = activeExerciseConfig.progressionStrategy === strategy;
                        const option =
                          strategy === "double_progression"
                            ? { title: "Reps then weight", subtitle: "Build reps in your range, then add weight." }
                            : strategy === "fixed_weight"
                              ? { title: "Weight only", subtitle: "Keep reps steady and add weight over time." }
                              : strategy === "bodyweight_reps"
                                ? { title: "Bodyweight reps", subtitle: "Add reps over time. No added load." }
                                : strategy === "bodyweight_weighted"
                                  ? { title: "Bodyweight + load", subtitle: "Add load over time (belt/vest)." }
                                  : { title: "Manual", subtitle: "No recommendations. You control changes manually." };

                        return (
                          <ListRow
                            key={strategy}
                            title={option.title}
                            subtitle={option.subtitle}
                            onPress={() => updateActiveConfig({ progressionStrategy: strategy })}
                            right={
                              selected ? (
                                <AppText variant="caption" tone="accent">
                                  Selected
                                </AppText>
                              ) : null
                            }
                          />
                        );
                      })}
                    </View>
                  </View>
                </View>
              </Card>

              {props.errorMessage ? <AppText variant="error">{props.errorMessage}</AppText> : null}
              {validationError ? <AppText variant="error">{validationError}</AppText> : null}
              <View style={styles.configureActions}>
                <PrimaryButton
                  label={configureIndex === 0 ? "Back" : "Previous"}
                  variant="secondary"
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
            </ScrollView>
          ) : (
            <AppText tone="secondary">Choose an exercise to continue.</AppText>
          )}
      </KeyboardAvoidingView>
    </ModalSheet>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  sheetContent: { flex: 1 },
  sheetCompact: {
    gap: spacing.sm,
    padding: spacing.md
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
  inlineInputGroup: {
    gap: spacing.xs
  },
  strategyList: {
    gap: 0
  },
  exerciseChoiceList: {
    gap: spacing.sm,
    paddingBottom: spacing.lg
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
  detailsCardContent: {
    gap: spacing.sm
  },
  filterSection: {
    gap: spacing.xs
  },
  filterRow: {
    alignItems: "center",
    gap: spacing.xs,
    paddingVertical: 2
  },
  selectedExerciseChoice: {
    backgroundColor: colors.surface,
    borderColor: colors.accentStrong,
    borderLeftWidth: borderWidths.thick
  },
  configureScroll: {
    flex: 1
  },
  configureScrollContent: {
    gap: spacing.md,
    paddingBottom: spacing.lg
  },
  configureCardContent: { gap: spacing.sm },
  configureInputs: {
    gap: spacing.sm
  },
  configureActions: {
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between"
  }
});
