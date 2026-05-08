import { useEffect, useMemo, useState } from "react";
import { generateCustomWorkoutNameFromExercises } from "@fitness/shared";
import type {
  ExerciseCatalogItemDto,
  ProgramDto,
  ProgramWorkoutExerciseDto,
  ProgramWorkoutTemplateDto,
  TrainingGoal
} from "@fitness/shared";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { StyleSheet, View } from "react-native";
import { AppText } from "../components/AppText";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { Input } from "../components/Input";
import { ModalSheet } from "../components/ModalSheet";
import { Screen } from "../components/Screen";
import { PrimaryButton } from "../components/PrimaryButton";
import { Chip } from "../components/Chip";
import { ExercisePickerModal } from "../features/workout/components/ExercisePickerModal";
import { ProgramDayWorkoutBuilderCard } from "../features/workout/components/ProgramDayWorkoutBuilderCard";
import type { RootStackParamList } from "../core/navigation/navigation-types";
import { useCreateCustomProgram } from "../features/workout/hooks/useCreateCustomProgram";
import { useDashboard } from "../features/workout/hooks/useDashboard";
import { useFollowProgram } from "../features/workout/hooks/useFollowProgram";
import { useStartWorkout } from "../features/workout/hooks/useStartWorkout";
import { useTrainingSettings } from "../features/workout/hooks/useTrainingSettings";
import { useUpdateCustomProgram } from "../features/workout/hooks/useUpdateCustomProgram";
import { useExercises } from "../features/workout/hooks/useExercises";
import { usePrograms } from "../features/workout/hooks/usePrograms";
import { useProgramTrainingContext } from "../features/workout/hooks/useProgramTrainingContext";
import { useUpdateManualProgramGoalContext } from "../features/workout/hooks/useUpdateManualProgramGoalContext";
import {
  buildAssignedProgramRequest,
  createProgramDayAssignments,
  duplicateProgramWorkoutTemplate,
  removeProgramDayAssignment,
  resizeProgramDayAssignments,
  CUSTOM_WORKOUT_BUILDER_PREFIX,
  type ProgramDayAssignment
} from "../features/workout/utils/program-creator.shared";
import {
  CUSTOM_WORKOUT_DEFAULT_TARGET_REPS,
  CUSTOM_WORKOUT_DEFAULT_TARGET_SETS
} from "../features/workout/hooks/useCustomWorkoutExercises";
import { colors, spacing } from "../theme/tokens";
import { parseRepTargetText } from "../features/workout/utils/prescription.shared";
import type { ManualProgramGoalContextDto, ProgressionAggressiveness } from "@fitness/shared";

type Props = NativeStackScreenProps<RootStackParamList, "CreateProgram">;

const MAX_WORKOUT_DAYS = 6;

function buildProgramDayAssignmentsFromProgram(program: ProgramDto): ProgramDayAssignment[] {
  return [...program.workouts]
    .sort((left, right) => left.sequenceOrder - right.sequenceOrder)
    .map((workout, index) => ({
      dayNumber: index + 1,
      workout
    }));
}

function getFirstWorkoutTemplateId(program: ProgramDto): string | null {
  const first = [...program.workouts].sort((left, right) => left.sequenceOrder - right.sequenceOrder)[0] ?? null;
  return first?.id ?? null;
}

function mapTrainingGoalToGuidedGoalType(value: TrainingGoal | null): ManualProgramGoalContextDto["goalType"] {
  if (value === "strength") return "strength";
  if (value === "hypertrophy") return "hypertrophy";
  if (value === "maintenance") return "consistency";
  return "general_fitness";
}

export function CreateProgramScreen({ navigation, route }: Props) {
  const editProgramId = route.params?.editProgramId;
  const cloneProgramId = route.params?.cloneProgramId;
  const [programName, setProgramName] = useState("");
  const [days, setDays] = useState<ProgramDayAssignment[]>(createProgramDayAssignments(1));
  const [exercisePickerDayNumber, setExercisePickerDayNumber] = useState<number | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [savedProgramId, setSavedProgramId] = useState<string | null>(null);
  const [savedProgramFirstWorkoutId, setSavedProgramFirstWorkoutId] = useState<string | null>(null);
  const [autoFollowPending, setAutoFollowPending] = useState(false);
  const [startAfterSavePending, setStartAfterSavePending] = useState(false);
  const [goalPromptDismissed, setGoalPromptDismissed] = useState(false);
  const [goalSheetVisible, setGoalSheetVisible] = useState(false);
  const [goalType, setGoalType] = useState<ManualProgramGoalContextDto["goalType"]>("general_fitness");
  const [targetWorkoutsPerWeek, setTargetWorkoutsPerWeek] = useState("1");
  const [plannedWeeks, setPlannedWeeks] = useState<ManualProgramGoalContextDto["plannedWeeks"]>(8);
  const [progressionStyle, setProgressionStyle] = useState<ProgressionAggressiveness>("balanced");
  const [goalValidationError, setGoalValidationError] = useState<string | null>(null);
  const [loadedSourceProgramId, setLoadedSourceProgramId] = useState<string | null>(null);
  const dashboardQuery = useDashboard();
  const trainingSettingsQuery = useTrainingSettings();
  const programsQuery = usePrograms();
  const exercisesQuery = useExercises(exercisePickerDayNumber !== null);
  const createProgramMutation = useCreateCustomProgram();
  const updateProgramMutation = useUpdateCustomProgram();
  const followProgramMutation = useFollowProgram();
  const startWorkoutMutation = useStartWorkout();
  const unitSystem = trainingSettingsQuery.data?.unitSystem ?? "imperial";
  const trainingGoal: TrainingGoal | null = trainingSettingsQuery.data?.trainingGoal ?? null;
  const programIdForContext = savedProgramId ?? (editProgramId ?? null);
  const trainingContextQuery = useProgramTrainingContext(programIdForContext);
  const updateGoalContextMutation = useUpdateManualProgramGoalContext();
  const sourceProgramId = editProgramId ?? cloneProgramId ?? null;
  const editProgram = useMemo(
    () =>
      sourceProgramId
        ? (programsQuery.data ?? []).find((program) => program.id === sourceProgramId) ?? null
        : null,
    [sourceProgramId, programsQuery.data]
  );
  const isEditing = Boolean(editProgramId);
  const isCloning = Boolean(cloneProgramId) && !isEditing;

  useEffect(() => {
    if (!editProgram || loadedSourceProgramId === editProgram.id) {
      return;
    }

    setProgramName(isCloning ? `${editProgram.name} (Custom)` : editProgram.name);
    setDays(buildProgramDayAssignmentsFromProgram(editProgram));
    setSavedProgramId(null);
    setSavedProgramFirstWorkoutId(null);
    setLoadedSourceProgramId(editProgram.id);
  }, [editProgram, isCloning, loadedSourceProgramId]);

  useEffect(() => {
    if (!trainingSettingsQuery.data) {
      return;
    }

    if (trainingContextQuery.data?.manualGoalContext) {
      const context = trainingContextQuery.data.manualGoalContext;
      setGoalType(context.goalType);
      setTargetWorkoutsPerWeek(String(context.targetWorkoutsPerWeek));
      setPlannedWeeks(context.plannedWeeks);
      setProgressionStyle(context.progressionStyle);
      return;
    }

    setGoalType(mapTrainingGoalToGuidedGoalType(trainingSettingsQuery.data.trainingGoal));
    setTargetWorkoutsPerWeek(String(Math.max(1, Math.min(14, days.length))));
    setPlannedWeeks(8);
    setProgressionStyle(trainingSettingsQuery.data.progressionAggressiveness);
  }, [days.length, trainingContextQuery.data?.manualGoalContext, trainingSettingsQuery.data]);

  useEffect(() => {
    const assignedDayNumber = route.params?.assignedDayNumber;
    const assignedWorkout = route.params?.assignedWorkout;

    if (!assignedDayNumber || !assignedWorkout) {
      return;
    }

    assignWorkoutToDay(assignedDayNumber, assignedWorkout);
    navigation.setParams({
      assignedDayNumber: undefined,
      assignedWorkout: undefined,
      assignmentId: undefined
    });
  }, [navigation, route.params?.assignmentId]);

  function normalizeDays(next: ProgramDayAssignment[]) {
    return next.map((day, index) => ({
      ...day,
      dayNumber: index + 1
    }));
  }

  function addWorkoutDay() {
    setDays((current) => {
      if (current.length >= MAX_WORKOUT_DAYS) {
        return current;
      }

      return resizeProgramDayAssignments({
        current,
        daysPerWeek: current.length + 1
      });
    });
    setSavedProgramId(null);
    setSavedProgramFirstWorkoutId(null);
  }

  function removeWorkoutDay(dayNumber: number) {
    setDays((current) => removeProgramDayAssignment({ current, dayNumber }));
    setSavedProgramId(null);
    setSavedProgramFirstWorkoutId(null);
  }

  function moveWorkoutDay(dayNumber: number, direction: -1 | 1) {
    setDays((current) => {
      const index = current.findIndex((day) => day.dayNumber === dayNumber);
      if (index < 0) return current;

      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= current.length) return current;

      const next = current.slice();
      const swap = next[index]!;
      next[index] = next[nextIndex]!;
      next[nextIndex] = swap;
      return normalizeDays(next);
    });
    setSavedProgramId(null);
    setSavedProgramFirstWorkoutId(null);
  }

  function assignWorkoutToDay(dayNumber: number, workout: ProgramWorkoutTemplateDto) {
    setDays((current) =>
      current.map((day) => (day.dayNumber === dayNumber ? { ...day, workout } : day))
    );
    setSavedProgramId(null);
    setSavedProgramFirstWorkoutId(null);
  }

  function getDefaultProgressionStrategy(exercise: ExerciseCatalogItemDto) {
    if (!exercise.isProgressionEligible) {
      return "no_progression" as const;
    }

    if (exercise.isBodyweight) {
      return exercise.isWeightOptional ? ("bodyweight_weighted" as const) : ("bodyweight_reps" as const);
    }

    return "double_progression" as const;
  }

  function getDefaultRepTargetText(exercise: ExerciseCatalogItemDto) {
    if (exercise.loggingModality !== "reps_load" && exercise.loggingModality !== "reps_only") {
      return null;
    }

    const isCompound = exercise.category === "compound";

    switch (trainingGoal) {
      case "strength":
        return isCompound ? "3-6" : "6-10";
      case "hypertrophy":
        return isCompound ? "6-10" : "10-15";
      case "endurance":
        return isCompound ? "8-12" : "12-20";
      case "general_fitness":
      case "maintenance":
      default: {
        const fallback = exercise.defaultTargetReps ?? CUSTOM_WORKOUT_DEFAULT_TARGET_REPS;
        return isCompound ? "6-10" : `8-${Math.max(12, fallback)}`;
      }
    }
  }

  function buildSuggestedWorkoutName(input: {
    entries: ProgramWorkoutExerciseDto[];
    exercises: ExerciseCatalogItemDto[];
  }) {
    const resolved =
      input.exercises.length > 0
        ? (() => {
            const exercisesById = new Map(input.exercises.map((exercise) => [exercise.id, exercise]));
            return input.entries
              .map((entry) => exercisesById.get(entry.exerciseId) ?? null)
              .filter(Boolean) as ExerciseCatalogItemDto[];
          })()
        : [];

    const nameInput =
      resolved.length > 0
        ? resolved.map((exercise) => ({
            name: exercise.name,
            primaryMuscleGroup: exercise.primaryMuscleGroup,
            movementPattern: exercise.movementPattern,
            category: exercise.category
          }))
        : input.entries.map((entry) => ({
            name: entry.exerciseName,
            primaryMuscleGroup: null,
            movementPattern: null,
            category: entry.category
          }));

    if (nameInput.length === 0) {
      return null;
    }

    return generateCustomWorkoutNameFromExercises(nameInput) ?? null;
  }

  function ensureNormalizedExercises(exercises: ProgramWorkoutExerciseDto[]) {
    return [...exercises]
      .sort((left, right) => left.sequenceOrder - right.sequenceOrder)
      .map((exercise, index) => ({ ...exercise, sequenceOrder: index + 1 }));
  }

  function addExerciseToDay(input: { dayNumber: number; exercise: ExerciseCatalogItemDto }) {
    setDays((current) =>
      current.map((day) => {
        if (day.dayNumber !== input.dayNumber) {
          return day;
        }

        const existingWorkout = day.workout;
        const baseWorkout: ProgramWorkoutTemplateDto =
          existingWorkout ??
          ({
            id: `${CUSTOM_WORKOUT_BUILDER_PREFIX}day-${input.dayNumber}:${Date.now()}`,
            name: "Workout",
            category: "Full Body",
            sequenceOrder: 1,
            estimatedDurationMinutes: null,
            exercises: []
          } satisfies ProgramWorkoutTemplateDto);

        const normalized = ensureNormalizedExercises(baseWorkout.exercises);
        const modality = input.exercise.loggingModality ?? "reps_load";
        const isRepsBased = modality === "reps_load" || modality === "reps_only";
        const repTargetText = isRepsBased
          ? getDefaultRepTargetText(input.exercise) ?? String(input.exercise.defaultTargetReps ?? CUSTOM_WORKOUT_DEFAULT_TARGET_REPS)
          : null;
        const repDraft = isRepsBased && repTargetText ? parseRepTargetText(repTargetText) : null;
        const defaultWeight =
          modality === "reps_load" &&
          !input.exercise.isBodyweight &&
          (!input.exercise.isWeightOptional || input.exercise.defaultStartingWeight.value > 0)
            ? input.exercise.defaultStartingWeight
            : null;
        const defaultTargets = (() => {
          if (modality === "hold") {
            return { targetSets: 3, targetDurationSeconds: 30, targetDistanceMeters: null, targetRounds: null };
          }

          if (modality === "time") {
            return { targetSets: 1, targetDurationSeconds: 20 * 60, targetDistanceMeters: null, targetRounds: null };
          }

          if (modality === "time_distance") {
            return {
              targetSets: 1,
              targetDurationSeconds: 20 * 60,
              targetDistanceMeters: null,
              targetRounds: null
            };
          }

          if (modality === "distance") {
            const distanceMeters = unitSystem === "metric" ? 2000 : 1609.344;
            return { targetSets: 1, targetDurationSeconds: null, targetDistanceMeters: distanceMeters, targetRounds: null };
          }

          if (modality === "interval") {
            return { targetSets: 1, targetDurationSeconds: null, targetDistanceMeters: null, targetRounds: 5 };
          }

          return { targetSets: null as number | null, targetDurationSeconds: null, targetDistanceMeters: null, targetRounds: null };
        })();

        const nextEntry: ProgramWorkoutExerciseDto = {
          id: `${CUSTOM_WORKOUT_BUILDER_PREFIX}${input.exercise.id}:${Date.now()}`,
          exerciseId: input.exercise.id,
          exerciseName: input.exercise.name,
          category: input.exercise.category,
          loggingModality: modality,
          sequenceOrder: normalized.length + 1,
          targetSets: defaultTargets.targetSets ?? input.exercise.defaultTargetSets ?? CUSTOM_WORKOUT_DEFAULT_TARGET_SETS,
          targetReps: isRepsBased ? (repDraft?.targetReps ?? input.exercise.defaultTargetReps ?? CUSTOM_WORKOUT_DEFAULT_TARGET_REPS) : null,
          ...(defaultTargets.targetDurationSeconds !== null ? { targetDurationSeconds: defaultTargets.targetDurationSeconds } : {}),
          ...(defaultTargets.targetDistanceMeters !== null ? { targetDistanceMeters: defaultTargets.targetDistanceMeters } : {}),
          ...(defaultTargets.targetRounds !== null ? { targetRounds: defaultTargets.targetRounds } : {}),
          ...(defaultWeight ? { targetWeight: defaultWeight } : {}),
          ...(isRepsBased && repDraft
            ? {
                repTargetText: repDraft.repTargetText,
                ...(repDraft.repRangeMin != null && repDraft.repRangeMax != null && repDraft.repRangeMax > repDraft.repRangeMin
                  ? { repRangeMin: repDraft.repRangeMin, repRangeMax: repDraft.repRangeMax }
                  : {})
              }
            : {}),
          restSeconds: null,
          progressionStrategy: isRepsBased ? getDefaultProgressionStrategy(input.exercise) : ("no_progression" as const)
        };

        const nextEntries = [...normalized, nextEntry];
        const suggestedName = buildSuggestedWorkoutName({ entries: nextEntries, exercises: exercisesQuery.data ?? [] });

        return {
          ...day,
          workout: {
            ...baseWorkout,
            name:
              baseWorkout.name.trim() && baseWorkout.name !== "Workout"
                ? baseWorkout.name
                : suggestedName ?? baseWorkout.name,
            exercises: nextEntries
          }
        };
      })
    );
    setSavedProgramId(null);
    setSavedProgramFirstWorkoutId(null);
  }

  function followAndStartProgram(input: { programId: string; firstWorkoutId: string }) {
    setStartAfterSavePending(true);
    setAutoFollowPending(true);

    followProgramMutation.mutate(input.programId, {
      onSuccess: () => {
        startWorkoutMutation.mutate(
          {
            workoutTemplateId: input.firstWorkoutId
          },
          {
            onSuccess: () => navigation.navigate("ActiveWorkout"),
            onSettled: () => {
              setAutoFollowPending(false);
              setStartAfterSavePending(false);
            }
          }
        );
      },
      onError: () => {
        setAutoFollowPending(false);
        setStartAfterSavePending(false);
      }
    });
  }

  function handleSaveProgram(input?: { startAfterSave?: boolean }) {
    const startAfterSave = input?.startAfterSave ?? false;

    const preserveEntryIdsForWorkoutIds =
      editProgramId && editProgram?.source === "custom"
        ? new Set(editProgram.workouts.map((workout) => workout.id))
        : undefined;

    const result = buildAssignedProgramRequest({
      name: programName,
      days,
      preserveEntryIdsForWorkoutIds
    });

    if (result.error) {
      setValidationError(result.error);
      return;
    }

    setValidationError(null);
    if (editProgramId && editProgram?.source === "custom") {
      updateProgramMutation.mutate(
        {
          programId: editProgramId,
          request: result.request
        },
        {
          onSuccess: (response) => {
            setSavedProgramId(response.data.program.id);
            setSavedProgramFirstWorkoutId(getFirstWorkoutTemplateId(response.data.program));
            if (startAfterSave) {
              const firstWorkoutId = getFirstWorkoutTemplateId(response.data.program);
              if (firstWorkoutId) {
                followAndStartProgram({ programId: response.data.program.id, firstWorkoutId });
              }
            }
          }
        }
      );
      return;
    }

    createProgramMutation.mutate(result.request, {
      onSuccess: (response) => {
        const createdProgramId = response.data.program.id;
        const firstWorkoutId = getFirstWorkoutTemplateId(response.data.program);
        setSavedProgramId(createdProgramId);
        setSavedProgramFirstWorkoutId(firstWorkoutId);

        const hasActiveProgram = Boolean(dashboardQuery.data?.activeProgram);
        const shouldAutoFollow =
          !isEditing &&
          !isCloning &&
          dashboardQuery.data !== undefined &&
          !hasActiveProgram;

        if (startAfterSave && firstWorkoutId) {
          followAndStartProgram({ programId: createdProgramId, firstWorkoutId });
          return;
        }

        if (shouldAutoFollow) {
          setAutoFollowPending(true);
          followProgramMutation.mutate(createdProgramId, {
            onSettled: () => setAutoFollowPending(false)
          });
        }
      }
    });
  }

  return (
    <Screen>
      <View style={styles.header}>
        <AppText variant="overline" tone="accent" style={styles.eyebrow}>
          {isEditing ? "Edit Program" : isCloning ? "Customize Program" : "Create Program"}
        </AppText>
        <AppText variant="title2" style={styles.title}>
          {isEditing
            ? "Update your program and workouts."
            : isCloning
              ? "Make this program yours with a custom copy."
              : "Start with one workout. Add more anytime."}
        </AppText>
        <AppText tone="secondary" style={styles.subtitle}>
          Name the program, add exercises, then start logging. You can fine-tune progression later.
        </AppText>
      </View>

      {(isEditing || isCloning) && programsQuery.isLoading ? (
        <AppText tone="secondary">Loading program...</AppText>
      ) : null}
      {(isEditing || isCloning) && !programsQuery.isLoading && !editProgram ? (
        <AppText variant="meta" tone="danger">
          We couldn't find that program.
        </AppText>
      ) : null}

      <Card padding="lg" contentStyle={styles.sectionContent}>
        <Input
          autoCapitalize="words"
          label="Program name"
          onChangeText={(value) => {
            setProgramName(value);
            setSavedProgramId(null);
          }}
          placeholder="Upper Lower Strength"
          value={programName}
        />
      </Card>

      <Card padding="lg" contentStyle={styles.sectionContent}>
        <AppText variant="sectionLabel" tone="accent">
          Workouts
        </AppText>
        <AppText variant="meta" tone="secondary">
          Build one workout to start. Add more workouts later (optional).
        </AppText>
        <View style={styles.workoutToolbar}>
          <Button
            label="Add workout"
            variant="secondary"
            size="sm"
            fullWidth={false}
            disabled={days.length >= MAX_WORKOUT_DAYS}
            onPress={addWorkoutDay}
          />
          <AppText variant="meta" tone="tertiary">
            {days.length}/{MAX_WORKOUT_DAYS}
          </AppText>
        </View>
      </Card>

      <Card padding="lg" contentStyle={styles.sectionContent}>
        {programsQuery.isLoading ? (
          <AppText tone="secondary">Loading workouts...</AppText>
        ) : (
          days.map((day) => (
            <View key={day.dayNumber} style={styles.dayBlock}>
              <ProgramDayWorkoutBuilderCard
                dayNumber={day.dayNumber}
                workout={day.workout}
                unitSystem={unitSystem}
                canRemoveWorkout={days.length > 1}
                onMoveUp={day.dayNumber > 1 ? () => moveWorkoutDay(day.dayNumber, -1) : null}
                onMoveDown={day.dayNumber < days.length ? () => moveWorkoutDay(day.dayNumber, 1) : null}
                onDuplicateWorkout={
                  day.workout
                    ? () => {
                        const duplicated = duplicateProgramWorkoutTemplate(day.workout);
                        setDays((current) => {
                          if (current.length >= MAX_WORKOUT_DAYS) {
                            return current;
                          }
                          const index = current.findIndex((candidate) => candidate.dayNumber === day.dayNumber);
                          if (index < 0) return current;
                          const next = current.slice();
                          next.splice(index + 1, 0, { dayNumber: 0, workout: duplicated });
                          return normalizeDays(next);
                        });
                        setSavedProgramId(null);
                        setSavedProgramFirstWorkoutId(null);
                      }
                    : null
                }
                onRemoveWorkoutDay={() => removeWorkoutDay(day.dayNumber)}
                onAddExercisePress={() => {
                  setSavedProgramId(null);
                  setSavedProgramFirstWorkoutId(null);
                  setExercisePickerDayNumber(day.dayNumber);
                }}
                onChangeWorkout={(workout) => {
                  setDays((current) =>
                    current.map((candidate) =>
                      candidate.dayNumber === day.dayNumber
                        ? (() => {
                            if (!workout) {
                              return { ...candidate, workout: null };
                            }

                            const previousWorkout = candidate.workout;
                            const previousName = previousWorkout?.name?.trim() ?? "";
                            const nextName = workout.name.trim();
                            const exercisesCatalog = exercisesQuery.data ?? [];

                            const previousSuggested =
                              previousWorkout?.exercises?.length
                                ? buildSuggestedWorkoutName({
                                    entries: previousWorkout.exercises,
                                    exercises: exercisesCatalog
                                  })
                                : null;
                            const nextSuggested = workout.exercises.length
                              ? buildSuggestedWorkoutName({ entries: workout.exercises, exercises: exercisesCatalog })
                              : null;

                            const previousWasAuto =
                              !previousName ||
                              previousName === "Workout" ||
                              (previousSuggested !== null && previousName === previousSuggested);

                            const nextNeedsDefault = !nextName || nextName === "Workout";
                            const carriedForward = previousName.length > 0 && nextName === previousName;

                            const updatedName = (() => {
                              if (nextNeedsDefault) {
                                return nextSuggested ?? workout.name;
                              }

                              if (previousWasAuto && carriedForward && nextSuggested) {
                                return nextSuggested;
                              }

                              return workout.name;
                            })();

                            return {
                              ...candidate,
                              workout: {
                                ...workout,
                                name: updatedName
                              }
                            };
                          })()
                        : candidate
                    )
                  );
                  setSavedProgramId(null);
                  setSavedProgramFirstWorkoutId(null);
                }}
              />
            </View>
          ))
        )}
      </Card>

      {isEditing && programIdForContext && !savedProgramId ? (
        <Card padding="lg" contentStyle={styles.sectionContent}>
          <AppText variant="sectionLabel" tone="accent">
            Program goal (optional)
          </AppText>
          {trainingContextQuery.data?.manualGoalContext ? (
            <>
              <AppText tone="secondary">
                {trainingContextQuery.data.manualGoalContext.goalType.replace(/_/g, " ")} ·{" "}
                {trainingContextQuery.data.manualGoalContext.targetWorkoutsPerWeek}/week ·{" "}
                {trainingContextQuery.data.manualGoalContext.plannedWeeks} weeks ·{" "}
                {trainingContextQuery.data.manualGoalContext.progressionStyle}
              </AppText>
              <Button
                label="Edit goal"
                variant="secondary"
                size="sm"
                fullWidth={false}
                onPress={() => {
                  setGoalValidationError(null);
                  setGoalSheetVisible(true);
                }}
              />
            </>
          ) : trainingContextQuery.isLoading ? (
            <AppText tone="secondary">Loading goal…</AppText>
          ) : (
            <>
              <AppText tone="secondary">Want the app to monitor this program toward a goal?</AppText>
              <Button
                label="Add goal"
                variant="secondary"
                size="sm"
                fullWidth={false}
                onPress={() => {
                  setGoalValidationError(null);
                  setGoalSheetVisible(true);
                }}
              />
            </>
          )}
        </Card>
      ) : null}

      {validationError ? (
        <AppText variant="meta" tone="danger">
          {validationError}
        </AppText>
      ) : null}
      {programsQuery.error instanceof Error ? (
        <AppText variant="meta" tone="danger">
          {programsQuery.error.message}
        </AppText>
      ) : null}
      {createProgramMutation.error instanceof Error ? (
        <AppText variant="meta" tone="danger">
          {createProgramMutation.error.message}
        </AppText>
      ) : null}
      {updateProgramMutation.error instanceof Error ? (
        <AppText variant="meta" tone="danger">
          {updateProgramMutation.error.message}
        </AppText>
      ) : null}
      {followProgramMutation.error instanceof Error ? (
        <AppText variant="meta" tone="danger">
          {followProgramMutation.error.message}
        </AppText>
      ) : null}

      {savedProgramId ? (
        <Card padding="lg" variant="hero" contentStyle={styles.sectionContent}>
          <AppText variant="sectionLabel" tone="accent">
            Saved
          </AppText>
          <AppText tone="secondary">
            {isEditing ? "Your program changes are saved." : "Your program is ready to start."}
          </AppText>
          <PrimaryButton
            label="Start workout"
            loading={startWorkoutMutation.isPending || startAfterSavePending}
            disabled={
              !savedProgramFirstWorkoutId ||
              followProgramMutation.isPending ||
              startWorkoutMutation.isPending ||
              autoFollowPending ||
              startAfterSavePending
            }
            onPress={() => {
              if (!savedProgramFirstWorkoutId) {
                return;
              }
              followAndStartProgram({ programId: savedProgramId, firstWorkoutId: savedProgramFirstWorkoutId });
            }}
          />
          <PrimaryButton
            label="Back to Dashboard"
            variant="secondary"
            disabled={followProgramMutation.isPending || startWorkoutMutation.isPending || autoFollowPending || startAfterSavePending}
            onPress={() => navigation.navigate("Dashboard")}
          />
          {trainingContextQuery.data?.manualGoalContext ? (
            <Card padding="md" variant="default" contentStyle={styles.goalCardContent}>
              <AppText variant="bodyStrong">Program goal</AppText>
              <AppText tone="secondary">
                {trainingContextQuery.data.manualGoalContext.goalType.replace(/_/g, " ")} ·{" "}
                {trainingContextQuery.data.manualGoalContext.targetWorkoutsPerWeek}/week ·{" "}
                {trainingContextQuery.data.manualGoalContext.plannedWeeks} weeks ·{" "}
                {trainingContextQuery.data.manualGoalContext.progressionStyle}
              </AppText>
              <Button
                label="Edit goal"
                variant="secondary"
                size="sm"
                fullWidth={false}
                onPress={() => {
                  setGoalValidationError(null);
                  setGoalSheetVisible(true);
                }}
              />
            </Card>
          ) : goalPromptDismissed || trainingContextQuery.isLoading ? null : (
            <Card padding="md" variant="default" contentStyle={styles.goalCardContent}>
              <AppText variant="bodyStrong">Want the app to monitor this program toward a goal?</AppText>
              <View style={styles.goalPromptActions}>
                <Button
                  label="Add goal"
                  variant="secondary"
                  size="sm"
                  fullWidth={false}
                  onPress={() => {
                    setGoalValidationError(null);
                    setGoalSheetVisible(true);
                  }}
                />
                <Button
                  label="Not now"
                  variant="ghost"
                  size="sm"
                  fullWidth={false}
                  onPress={() => setGoalPromptDismissed(true)}
                />
              </View>
            </Card>
          )}
        </Card>
      ) : (
        <View style={styles.saveActions}>
          {!isEditing ? (
            <PrimaryButton
              label={isCloning ? "Create & Start" : "Create & Start"}
              disabled={programsQuery.isLoading || ((isEditing || isCloning) && !editProgram)}
              loading={createProgramMutation.isPending || updateProgramMutation.isPending || startAfterSavePending}
              onPress={() => handleSaveProgram({ startAfterSave: true })}
            />
          ) : null}
          <PrimaryButton
            label={isEditing ? "Save Changes" : "Create Program"}
            variant={!isEditing ? "secondary" : "primary"}
            disabled={programsQuery.isLoading || ((isEditing || isCloning) && !editProgram)}
            loading={createProgramMutation.isPending || updateProgramMutation.isPending}
            onPress={() => handleSaveProgram({ startAfterSave: false })}
          />
        </View>
      )}
      <ExercisePickerModal
        visible={exercisePickerDayNumber !== null}
        title="Add exercise"
        subtitle={exercisePickerDayNumber ? `Workout ${exercisePickerDayNumber}` : undefined}
        exercises={exercisesQuery.data ?? []}
        loading={exercisesQuery.isLoading}
        onClose={() => setExercisePickerDayNumber(null)}
        onSelect={(exercise) => {
          if (!exercisePickerDayNumber) {
            return;
          }

          addExerciseToDay({ dayNumber: exercisePickerDayNumber, exercise });
          setExercisePickerDayNumber(null);
        }}
      />

      <ModalSheet
        visible={goalSheetVisible && Boolean(programIdForContext)}
        onClose={() => setGoalSheetVisible(false)}
        title="Program goal"
        subtitle="Optional"
        headerRight={
          <PrimaryButton
            label="Close"
            variant="ghost"
            fullWidth={false}
            size="sm"
            onPress={() => setGoalSheetVisible(false)}
          />
        }
        contentStyle={styles.goalSheetContent}
      >
        <View style={styles.goalSheetBody}>
          <AppText tone="secondary">
            This does not change your workouts today. It just saves context for future coaching features.
          </AppText>

          <Card padding="md" variant="muted" contentStyle={styles.goalSection}>
            <AppText variant="bodyStrong">Goal type</AppText>
            <View style={styles.goalChoiceRow}>
              {(["strength", "hypertrophy", "general_fitness", "consistency", "sport_support", "custom"] as const).map(
                (option) => (
                  <Chip
                    key={option}
                    label={option.replace(/_/g, " ")}
                    selected={goalType === option}
                    onPress={() => setGoalType(option)}
                  />
                )
              )}
            </View>
          </Card>

          <Card padding="md" variant="muted" contentStyle={styles.goalSection}>
            <Input
              label="Target workouts per week"
              keyboardType="number-pad"
              value={targetWorkoutsPerWeek}
              onChangeText={(value) => {
                setTargetWorkoutsPerWeek(value);
                setGoalValidationError(null);
              }}
              placeholder={String(Math.max(1, days.length))}
            />
          </Card>

          <Card padding="md" variant="muted" contentStyle={styles.goalSection}>
            <AppText variant="bodyStrong">Planned weeks</AppText>
            <View style={styles.goalChoiceRow}>
              {([4, 6, 8, 12] as const).map((option) => (
                <Chip
                  key={option}
                  label={`${option}`}
                  selected={plannedWeeks === option}
                  onPress={() => setPlannedWeeks(option)}
                />
              ))}
            </View>
          </Card>

          <Card padding="md" variant="muted" contentStyle={styles.goalSection}>
            <AppText variant="bodyStrong">Progression style</AppText>
            <View style={styles.goalChoiceRow}>
              {(["conservative", "balanced", "aggressive"] as const).map((option) => (
                <Chip
                  key={option}
                  label={option}
                  selected={progressionStyle === option}
                  onPress={() => setProgressionStyle(option)}
                />
              ))}
            </View>
          </Card>

          {goalValidationError ? (
            <AppText variant="meta" tone="danger">
              {goalValidationError}
            </AppText>
          ) : null}
          {updateGoalContextMutation.error instanceof Error ? (
            <AppText variant="meta" tone="danger">
              {updateGoalContextMutation.error.message}
            </AppText>
          ) : null}

          <PrimaryButton
            label="Save goal"
            loading={updateGoalContextMutation.isPending}
            disabled={updateGoalContextMutation.isPending || !programIdForContext}
            onPress={() => {
              if (!programIdForContext) {
                return;
              }

              const parsedTarget = Number.parseInt(targetWorkoutsPerWeek.trim(), 10);
              if (!Number.isFinite(parsedTarget) || parsedTarget < 1 || parsedTarget > 14) {
                setGoalValidationError("Target workouts per week must be between 1 and 14.");
                return;
              }

              setGoalValidationError(null);
              updateGoalContextMutation.mutate(
                {
                  programId: programIdForContext,
                  request: {
                    manualGoalContext: {
                      goalType,
                      targetWorkoutsPerWeek: parsedTarget,
                      plannedWeeks,
                      progressionStyle
                    }
                  }
                },
                {
                  onSuccess: () => {
                    setGoalPromptDismissed(true);
                    setGoalSheetVisible(false);
                  }
                }
              );
            }}
          />
        </View>
      </ModalSheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: spacing.sm
  },
  eyebrow: {
    color: colors.accentStrong,
    fontSize: 14,
    fontWeight: "600",
    textTransform: "uppercase"
  },
  title: {
    color: colors.textPrimary,
    fontSize: 28,
    fontWeight: "600",
    lineHeight: 34
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 16,
    lineHeight: 22
  },
  sectionContent: {
    gap: spacing.sm
  },
  workoutToolbar: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm
  },
  dayBlock: {
    gap: spacing.xs
  },
  saveActions: {
    gap: spacing.sm
  },
  goalCardContent: {
    gap: spacing.sm
  },
  goalPromptActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  goalSheetContent: {
    paddingBottom: spacing.lg
  },
  goalSheetBody: {
    gap: spacing.md
  },
  goalSection: {
    gap: spacing.sm
  },
  goalChoiceRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  }
});
