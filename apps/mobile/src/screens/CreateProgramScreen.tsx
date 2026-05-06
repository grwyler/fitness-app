import { useEffect, useMemo, useState } from "react";
import { generateCustomWorkoutNameFromExercises } from "@fitness/shared";
import type {
  ExerciseCatalogItemDto,
  ProgramDto,
  ProgramWorkoutExerciseDto,
  ProgramWorkoutTemplateDto
} from "@fitness/shared";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Pressable, StyleSheet, View } from "react-native";
import { AppText } from "../components/AppText";
import { Card } from "../components/Card";
import { Input } from "../components/Input";
import { Screen } from "../components/Screen";
import { PrimaryButton } from "../components/PrimaryButton";
import { ExercisePickerModal } from "../features/workout/components/ExercisePickerModal";
import { ProgramDayWorkoutBuilderCard } from "../features/workout/components/ProgramDayWorkoutBuilderCard";
import type { RootStackParamList } from "../core/navigation/navigation-types";
import { useCreateCustomProgram } from "../features/workout/hooks/useCreateCustomProgram";
import { useDashboard } from "../features/workout/hooks/useDashboard";
import { useFollowProgram } from "../features/workout/hooks/useFollowProgram";
import { useTrainingSettings } from "../features/workout/hooks/useTrainingSettings";
import { useUpdateCustomProgram } from "../features/workout/hooks/useUpdateCustomProgram";
import { useExercises } from "../features/workout/hooks/useExercises";
import { usePrograms } from "../features/workout/hooks/usePrograms";
import {
  buildAssignedProgramRequest,
  createProgramDayAssignments,
  resizeProgramDayAssignments,
  CUSTOM_WORKOUT_BUILDER_PREFIX,
  type ProgramDayAssignment
} from "../features/workout/utils/program-creator.shared";
import {
  CUSTOM_WORKOUT_DEFAULT_TARGET_REPS,
  CUSTOM_WORKOUT_DEFAULT_TARGET_SETS
} from "../features/workout/hooks/useCustomWorkoutExercises";
import { colors, spacing } from "../theme/tokens";

type Props = NativeStackScreenProps<RootStackParamList, "CreateProgram">;

const dayOptions = [1, 2, 3, 4, 5, 6] as const;

function buildProgramDayAssignmentsFromProgram(program: ProgramDto): ProgramDayAssignment[] {
  return [...program.workouts]
    .sort((left, right) => left.sequenceOrder - right.sequenceOrder)
    .map((workout, index) => ({
      dayNumber: index + 1,
      workout
    }));
}

export function CreateProgramScreen({ navigation, route }: Props) {
  const editProgramId = route.params?.editProgramId;
  const cloneProgramId = route.params?.cloneProgramId;
  const [programName, setProgramName] = useState("");
  const [daysPerWeek, setDaysPerWeek] = useState(3);
  const [days, setDays] = useState<ProgramDayAssignment[]>(createProgramDayAssignments(3));
  const [exercisePickerDayNumber, setExercisePickerDayNumber] = useState<number | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [savedProgramId, setSavedProgramId] = useState<string | null>(null);
  const [autoFollowPending, setAutoFollowPending] = useState(false);
  const [loadedSourceProgramId, setLoadedSourceProgramId] = useState<string | null>(null);
  const dashboardQuery = useDashboard();
  const trainingSettingsQuery = useTrainingSettings();
  const programsQuery = usePrograms();
  const exercisesQuery = useExercises(exercisePickerDayNumber !== null);
  const createProgramMutation = useCreateCustomProgram();
  const updateProgramMutation = useUpdateCustomProgram();
  const followProgramMutation = useFollowProgram();
  const unitSystem = trainingSettingsQuery.data?.unitSystem ?? "imperial";
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
    setDaysPerWeek(editProgram.daysPerWeek);
    setDays(buildProgramDayAssignmentsFromProgram(editProgram));
    setSavedProgramId(null);
    setLoadedSourceProgramId(editProgram.id);
  }, [editProgram, isCloning, loadedSourceProgramId]);

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

  function updateDaysPerWeek(nextDaysPerWeek: number) {
    setDaysPerWeek(nextDaysPerWeek);
    setDays((current) =>
      resizeProgramDayAssignments({
        current,
        daysPerWeek: nextDaysPerWeek
      })
    );
    setSavedProgramId(null);
  }

  function assignWorkoutToDay(dayNumber: number, workout: ProgramWorkoutTemplateDto) {
    setDays((current) =>
      current.map((day) => (day.dayNumber === dayNumber ? { ...day, workout } : day))
    );
    setSavedProgramId(null);
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
          targetReps: isRepsBased ? (input.exercise.defaultTargetReps ?? CUSTOM_WORKOUT_DEFAULT_TARGET_REPS) : null,
          ...(defaultTargets.targetDurationSeconds !== null ? { targetDurationSeconds: defaultTargets.targetDurationSeconds } : {}),
          ...(defaultTargets.targetDistanceMeters !== null ? { targetDistanceMeters: defaultTargets.targetDistanceMeters } : {}),
          ...(defaultTargets.targetRounds !== null ? { targetRounds: defaultTargets.targetRounds } : {}),
          ...(isRepsBased
            ? { repTargetText: String(input.exercise.defaultTargetReps ?? CUSTOM_WORKOUT_DEFAULT_TARGET_REPS) }
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
  }

  function handleSaveProgram() {
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
          }
        }
      );
      return;
    }

    createProgramMutation.mutate(result.request, {
      onSuccess: (response) => {
        const createdProgramId = response.data.program.id;
        setSavedProgramId(createdProgramId);

        const hasActiveProgram = Boolean(dashboardQuery.data?.activeProgram);
        const shouldAutoFollow =
          !isEditing &&
          !isCloning &&
          dashboardQuery.data !== undefined &&
          !hasActiveProgram;

        if (!shouldAutoFollow) {
          return;
        }

        setAutoFollowPending(true);
        followProgramMutation.mutate(createdProgramId, {
          onSuccess: () => navigation.navigate("Dashboard"),
          onSettled: () => setAutoFollowPending(false)
        });
      }
    });
  }

  return (
    <Screen>
      <View style={styles.header}>
        <AppText variant="overline" tone="accent" style={styles.eyebrow}>
          {isEditing ? "Edit Program" : isCloning ? "Customize Program" : "Create a program"}
        </AppText>
        <AppText variant="title2" style={styles.title}>
          {isEditing
            ? "Update your weekly training plan."
            : isCloning
              ? "Make this program yours with a custom copy."
              : "Create a weekly plan from workouts."}
        </AppText>
        <AppText tone="secondary" style={styles.subtitle}>
          Name the program, choose training days, then assign a workout to each day.
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
          Days per week
        </AppText>
        <AppText variant="meta" tone="secondary">
          Pick how often you want to train. You can change this later.
        </AppText>
        <View style={styles.dayOptionRow}>
          {dayOptions.map((option) => {
            const selected = option === daysPerWeek;

            return (
              <Pressable
                key={option}
                accessibilityRole="button"
                onPress={() => updateDaysPerWeek(option)}
                style={({ pressed }) => [
                  styles.dayOptionButton,
                  selected ? styles.dayOptionButtonSelected : null,
                  pressed ? styles.dayOptionButtonPressed : null
                ]}
              >
                <AppText variant="bodyStrong" tone={selected ? "accent" : "secondary"}>
                  {option}
                </AppText>
              </Pressable>
            );
          })}
        </View>
      </Card>

      <Card padding="lg" contentStyle={styles.sectionContent}>
        <AppText variant="sectionLabel" tone="accent">
          Program days
        </AppText>
        {programsQuery.isLoading ? (
          <AppText tone="secondary">Loading workouts...</AppText>
        ) : (
          days.map((day) => (
            <View key={day.dayNumber} style={styles.dayBlock}>
              <ProgramDayWorkoutBuilderCard
                dayNumber={day.dayNumber}
                workout={day.workout}
                unitSystem={unitSystem}
                onAddExercisePress={() => {
                  setSavedProgramId(null);
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
                }}
              />
            </View>
          ))
        )}
      </Card>

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
            {isEditing ? "Your program changes are saved." : "Your program is ready to follow."}
          </AppText>
          <PrimaryButton
            label="Follow Program"
            loading={followProgramMutation.isPending}
            disabled={followProgramMutation.isPending || autoFollowPending}
            onPress={() =>
              followProgramMutation.mutate(savedProgramId, {
                onSuccess: () => navigation.navigate("Dashboard")
              })
            }
          />
        </Card>
      ) : (
        <PrimaryButton
          label={isEditing ? "Save Changes" : "Save Program"}
          disabled={programsQuery.isLoading || ((isEditing || isCloning) && !editProgram)}
          loading={createProgramMutation.isPending || updateProgramMutation.isPending}
          onPress={handleSaveProgram}
        />
      )}
      <ExercisePickerModal
        visible={exercisePickerDayNumber !== null}
        title="Add exercise"
        subtitle={exercisePickerDayNumber ? `Day ${exercisePickerDayNumber}` : undefined}
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
  dayOptionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  dayOptionButton: {
    alignItems: "center",
    justifyContent: "center",
    minWidth: 52,
    backgroundColor: colors.surfaceMuted,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  dayOptionButtonSelected: {
    backgroundColor: colors.accentMuted
  },
  dayOptionButtonPressed: {
    opacity: 0.9
  },
  dayBlock: {
    gap: spacing.xs
  }
});
