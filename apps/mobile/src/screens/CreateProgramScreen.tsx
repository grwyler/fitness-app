import { useEffect, useMemo, useState } from "react";
import { generateCustomWorkoutNameFromExercises } from "@fitness/shared";
import type { AddCustomWorkoutExerciseRequest, ProgramDto, ProgramWorkoutTemplateDto } from "@fitness/shared";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { AppText } from "../components/AppText";
import { Card } from "../components/Card";
import { Chip } from "../components/Chip";
import { Input } from "../components/Input";
import { ModalSheet } from "../components/ModalSheet";
import { Screen } from "../components/Screen";
import { PrimaryButton } from "../components/PrimaryButton";
import { CustomExercisePickerModal } from "../features/workout/components/CustomExercisePickerModal";
import type { RootStackParamList } from "../core/navigation/navigation-types";
import { useCreateCustomProgram } from "../features/workout/hooks/useCreateCustomProgram";
import { useDashboard } from "../features/workout/hooks/useDashboard";
import { useFollowProgram } from "../features/workout/hooks/useFollowProgram";
import { useUpdateCustomProgram } from "../features/workout/hooks/useUpdateCustomProgram";
import { useExercises } from "../features/workout/hooks/useExercises";
import { usePrograms } from "../features/workout/hooks/usePrograms";
import {
  buildAssignedProgramRequest,
  buildCustomWorkoutExerciseRequestsFromProgramWorkout,
  createProgramDayAssignments,
  getAssignableWorkoutDescription,
  getAssignableWorkoutChoices,
  groupAssignableWorkoutChoices,
  resizeProgramDayAssignments,
  type AssignableWorkoutChoice,
  type AssignableWorkoutGroup,
  type ProgramDayAssignment
} from "../features/workout/utils/program-creator.shared";
import { getHiddenExerciseCount, getPlannedExerciseLines } from "../features/workout/utils/dashboard-program.shared";
import { colors, radius, spacing } from "../theme/tokens";

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
  const [pickerDayNumber, setPickerDayNumber] = useState<number | null>(null);
  const [customWorkoutDayNumber, setCustomWorkoutDayNumber] = useState<number | null>(null);
  const [customWorkoutName, setCustomWorkoutName] = useState("");
  const [customExerciseError, setCustomExerciseError] = useState<string | null>(null);
  const [customWorkoutInitialRequests, setCustomWorkoutInitialRequests] = useState<
    AddCustomWorkoutExerciseRequest[] | null
  >(null);
  const [customWorkoutInitKey, setCustomWorkoutInitKey] = useState(0);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [savedProgramId, setSavedProgramId] = useState<string | null>(null);
  const [autoFollowPending, setAutoFollowPending] = useState(false);
  const [loadedSourceProgramId, setLoadedSourceProgramId] = useState<string | null>(null);
  const dashboardQuery = useDashboard();
  const programsQuery = usePrograms();
  const exercisesQuery = useExercises(customWorkoutDayNumber !== null);
  const createProgramMutation = useCreateCustomProgram();
  const updateProgramMutation = useUpdateCustomProgram();
  const followProgramMutation = useFollowProgram();
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

  const workoutChoices = useMemo(
    () => getAssignableWorkoutChoices(programsQuery.data ?? []),
    [programsQuery.data]
  );
  const workoutGroups = useMemo(
    () => groupAssignableWorkoutChoices(workoutChoices),
    [workoutChoices]
  );
  const hasCustomWorkoutChoices = workoutChoices.some((choice) => choice.source === "custom");

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
    setPickerDayNumber(null);
    setSavedProgramId(null);
  }

  function openCustomWorkoutBuilderForDay(dayNumber: number) {
    setPickerDayNumber(null);
    setSavedProgramId(null);
    setCustomWorkoutDayNumber(dayNumber);
    setCustomWorkoutName("");
    setCustomExerciseError(null);
    setCustomWorkoutInitialRequests(null);
    setCustomWorkoutInitKey((current) => current + 1);
  }

  function openCustomWorkoutEditorForDay(dayNumber: number, workout: ProgramWorkoutTemplateDto) {
    setPickerDayNumber(null);
    setSavedProgramId(null);
    setCustomWorkoutDayNumber(dayNumber);
    setCustomWorkoutName(workout.name);
    setCustomExerciseError(null);
    setCustomWorkoutInitialRequests(buildCustomWorkoutExerciseRequestsFromProgramWorkout(workout));
    setCustomWorkoutInitKey((current) => current + 1);
  }

  function closeCustomWorkoutBuilder() {
    setCustomWorkoutDayNumber(null);
    setCustomWorkoutName("");
    setCustomExerciseError(null);
    setCustomWorkoutInitialRequests(null);
  }

  function assignCustomWorkoutToDay(input: {
    requests: AddCustomWorkoutExerciseRequest[];
  }) {
    if (!customWorkoutDayNumber) {
      return;
    }

    if (input.requests.length === 0) {
      setCustomExerciseError("Choose at least one exercise to continue.");
      return;
    }

    const exercisesById = new Map((exercisesQuery.data ?? []).map((exercise) => [exercise.id, exercise]));
    const selectedExercises = input.requests
      .map((request) => exercisesById.get(request.exerciseId) ?? null)
      .filter(Boolean);

    if (selectedExercises.length !== input.requests.length) {
      setCustomExerciseError("Some selected exercises were not found. Please try again.");
      return;
    }

    const normalizedName = customWorkoutName.trim().replace(/\s+/g, " ");
    const suggestedName =
      generateCustomWorkoutNameFromExercises(
        selectedExercises.map((exercise) => ({
          name: exercise.name,
          primaryMuscleGroup: exercise.primaryMuscleGroup,
          movementPattern: exercise.movementPattern,
          category: exercise.category
        }))
      ) ?? null;

    const workoutName = normalizedName || suggestedName || "Workout";
    const workoutIdSuffix = input.requests.map((request) => request.exerciseId).join(":") || "empty";

    assignWorkoutToDay(customWorkoutDayNumber, {
      id: `custom-builder:${workoutIdSuffix}`,
      name: workoutName,
      category: "Full Body",
      sequenceOrder: 1,
      estimatedDurationMinutes: null,
      exercises: input.requests.map((request, index) => {
        const exercise = exercisesById.get(request.exerciseId)!;
        return {
          id: `custom-builder:${request.exerciseId}`,
          exerciseId: request.exerciseId,
          exerciseName: exercise.name,
          category: exercise.category,
          sequenceOrder: index + 1,
          targetSets: request.targetSets,
          targetReps: request.targetReps,
          ...(request.progressionStrategy ? { progressionStrategy: request.progressionStrategy } : {}),
          restSeconds: null
        };
      })
    });
    closeCustomWorkoutBuilder();
  }

  function handleSaveProgram() {
    const result = buildAssignedProgramRequest({
      name: programName,
      days
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
          {isEditing ? "Edit Program" : isCloning ? "Customize Program" : "Create Program"}
        </AppText>
        <AppText variant="title2" style={styles.title}>
          {isEditing
            ? "Update your weekly training plan."
            : isCloning
              ? "Make this program yours with a custom copy."
              : "Build a weekly plan from workouts."}
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

      <Card style={styles.card}>
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

      <Card style={styles.card}>
        <AppText variant="label" tone="accent">
          Days per week
        </AppText>
        <View style={styles.dayOptionRow}>
          {dayOptions.map((option) => {
            const selected = option === daysPerWeek;

            return (
              <Pressable
                accessibilityRole="button"
                key={option}
                onPress={() => updateDaysPerWeek(option)}
                style={({ pressed }) => [
                  styles.dayOption,
                  selected && styles.selectedDayOption,
                  pressed && styles.pressedTile
                ]}
              >
                <AppText tone={selected ? "inverse" : "primary"} style={styles.dayOptionText}>
                  {option}
                </AppText>
              </Pressable>
            );
          })}
        </View>
      </Card>

      <Card style={styles.card}>
        <AppText variant="label" tone="accent">
          Program days
        </AppText>
        {programsQuery.isLoading ? (
          <AppText tone="secondary">Loading workouts...</AppText>
        ) : (
          days.map((day) => (
            <Card key={day.dayNumber} elevated={false} style={styles.dayCard}>
              <View style={styles.dayHeader}>
                <View style={styles.dayTitleGroup}>
                  <AppText variant="overline" tone="accent">
                    Day {day.dayNumber}
                  </AppText>
                  <AppText variant="bodyStrong">{day.workout?.name ?? "No workout selected"}</AppText>
                </View>
                <View style={styles.dayActions}>
                  {day.workout ? (
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => openCustomWorkoutEditorForDay(day.dayNumber, day.workout!)}
                    >
                      <AppText variant="meta" tone="accent">
                        Edit
                      </AppText>
                    </Pressable>
                  ) : null}
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setPickerDayNumber(day.dayNumber)}
                  >
                    <AppText variant="meta" tone="accent">
                      {day.workout ? "Change" : "Choose"}
                    </AppText>
                  </Pressable>
                </View>
              </View>
              {day.workout ? (
                <WorkoutPreview workout={day.workout} />
              ) : (
                <AppText tone="secondary">Choose a predefined workout or create one from scratch.</AppText>
              )}
            </Card>
          ))
        )}
        {!hasCustomWorkoutChoices ? (
          <AppText tone="secondary">
            Your Workouts will appear here after custom programs have reusable workout days.
          </AppText>
        ) : null}
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
        <Card style={styles.card}>
          <AppText variant="label" tone="accent">
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

      <WorkoutPickerModal
        groups={workoutGroups}
        loading={programsQuery.isLoading}
        visible={pickerDayNumber !== null}
        onClose={() => setPickerDayNumber(null)}
        onCreateCustomWorkout={() => {
          if (pickerDayNumber !== null) {
            openCustomWorkoutBuilderForDay(pickerDayNumber);
          }
        }}
        onSelectWorkout={(choice) => {
          if (pickerDayNumber !== null) {
            assignWorkoutToDay(pickerDayNumber, choice.workout);
          }
        }}
      />
      <CustomExercisePickerModal
        errorMessage={customExerciseError}
        exercises={exercisesQuery.data ?? []}
        loadingExercises={exercisesQuery.isLoading}
        initialRequests={customWorkoutInitialRequests}
        initializationKey={customWorkoutInitKey}
        mode="assignToProgramDay"
        {...(customWorkoutDayNumber !== null ? { programDayNumber: customWorkoutDayNumber } : {})}
        workoutName={customWorkoutName}
        submitting={false}
        visible={customWorkoutDayNumber !== null}
        onChangeWorkoutName={setCustomWorkoutName}
        onClose={closeCustomWorkoutBuilder}
        onSubmit={assignCustomWorkoutToDay}
      />
    </Screen>
  );
}

function WorkoutPreview(props: { workout: ProgramWorkoutTemplateDto }) {
  const plannedExerciseLines = getPlannedExerciseLines(props.workout, 3);
  const hiddenExerciseCount = getHiddenExerciseCount(props.workout, plannedExerciseLines.length);

  return (
    <View style={styles.exerciseList}>
      <AppText variant="meta" tone="secondary">
        {props.workout.category} - estimated {props.workout.estimatedDurationMinutes ?? 60} minutes
      </AppText>
      {plannedExerciseLines.map((line) => (
        <AppText key={line} variant="meta">
          {line}
        </AppText>
      ))}
      {hiddenExerciseCount > 0 ? (
        <AppText variant="meta">+{hiddenExerciseCount} more planned</AppText>
      ) : null}
    </View>
  );
}

function WorkoutPickerModal(props: {
  groups: AssignableWorkoutGroup[];
  loading: boolean;
  visible: boolean;
  onClose: () => void;
  onCreateCustomWorkout: () => void;
  onSelectWorkout: (choice: AssignableWorkoutChoice) => void;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [lengthFilter, setLengthFilter] = useState<"any" | "quick" | "standard" | "long">("any");

  const allChoices = useMemo(() => props.groups.flatMap((group) => group.workouts), [props.groups]);

  const isFiltering = Boolean(
    searchQuery.trim() || categoryFilter || lengthFilter !== "any"
  );

  const filteredChoices = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return allChoices.filter((choice) => {
      if (categoryFilter && choice.category !== categoryFilter) {
        return false;
      }

      const count = choice.workout.exercises.length;
      if (lengthFilter === "quick" && count > 3) {
        return false;
      }
      if (lengthFilter === "standard" && (count < 4 || count > 6)) {
        return false;
      }
      if (lengthFilter === "long" && count < 7) {
        return false;
      }

      if (!query) {
        return true;
      }

      const haystack = `${choice.workout.name} ${choice.programName} ${choice.category}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [allChoices, categoryFilter, lengthFilter, searchQuery]);

  const availableCategories = useMemo(() => {
    const titles = props.groups.map((group) => group.title).filter(Boolean);
    return Array.from(new Set(titles));
  }, [props.groups]);

  function clearFilters() {
    setCategoryFilter(null);
    setLengthFilter("any");
  }

  return (
    <ModalSheet
      headerRight={
        <Pressable accessibilityRole="button" onPress={props.onClose}>
          <AppText tone="accent" variant="meta">
            Close
          </AppText>
        </Pressable>
      }
      onClose={props.onClose}
      subtitle="Build workout"
      title="Create a workout"
      visible={props.visible}
    >
      <ScrollView contentContainerStyle={styles.workoutChoiceList}>
            <View style={styles.searchPanel}>
              <View style={styles.searchHeaderRow}>
                <AppText variant="label" tone="accent">
                  Search workouts
                </AppText>
                <Pressable accessibilityRole="button" onPress={() => setFiltersExpanded((current) => !current)}>
                  <AppText variant="meta" tone="accent">
                    {filtersExpanded ? "Hide filters" : categoryFilter || lengthFilter !== "any" ? "Filters (on)" : "Filters"}
                  </AppText>
                </Pressable>
              </View>
              <Input
                autoCapitalize="words"
                onChangeText={setSearchQuery}
                placeholder="Push, legs, beginner, upper..."
                value={searchQuery}
              />

              {filtersExpanded ? (
                <View style={styles.filterPanel}>
                  <View style={styles.chipRow}>
                    <AppText variant="overline" tone="secondary" style={styles.chipRowLabel}>
                      Type
                    </AppText>
                    <Chip label="All" onPress={() => setCategoryFilter(null)} selected={!categoryFilter} />
                    {availableCategories.map((title) => (
                      <Chip
                        key={`cat:${title}`}
                        label={title}
                        onPress={() => setCategoryFilter((current) => (current === title ? null : title))}
                        selected={categoryFilter === title}
                      />
                    ))}
                  </View>

                  <View style={styles.chipRow}>
                    <AppText variant="overline" tone="secondary" style={styles.chipRowLabel}>
                      Length
                    </AppText>
                    {(["any", "quick", "standard", "long"] as const).map((value) => (
                      <Pressable
                        accessibilityRole="button"
                        key={`len:${value}`}
                        onPress={() => setLengthFilter(value)}
                        style={[styles.chip, lengthFilter === value && styles.chipSelected]}
                      >
                        <AppText
                          tone={lengthFilter === value ? "accent" : "secondary"}
                          variant="meta"
                          style={[styles.chipText, lengthFilter === value && styles.chipTextSelected]}
                        >
                          {value === "any"
                            ? "Any"
                            : value === "quick"
                              ? "Quick (≤3)"
                              : value === "standard"
                                ? "Standard (4–6)"
                                : "Long (7+)"}
                        </AppText>
                      </Pressable>
                    ))}

                    {categoryFilter || lengthFilter !== "any" ? (
                      <Pressable accessibilityRole="button" onPress={clearFilters} style={styles.clearChip}>
                        <AppText tone="secondary" variant="meta" style={styles.clearChipText}>
                          Clear
                        </AppText>
                      </Pressable>
                    ) : null}
                  </View>
                </View>
              ) : null}
            </View>

            <Card onPress={props.onCreateCustomWorkout} style={[styles.workoutChoice, styles.createWorkoutChoice]}>
              <View style={styles.workoutTitleGroup}>
                <AppText variant="bodyStrong">Create a workout</AppText>
                <AppText variant="meta" tone="secondary">
                  Choose the exact exercises you want for this day.
                </AppText>
              </View>
              <AppText variant="meta" tone="accent">
                Create
              </AppText>
            </Card>

            <AppText variant="overline" tone="secondary" style={styles.suggestionsLabel}>
              Suggested workouts
            </AppText>
            {props.loading ? (
              <AppText tone="secondary">Loading workouts...</AppText>
            ) : props.groups.length === 0 ? (
              <AppText tone="secondary">No predefined or reusable workouts are available yet.</AppText>
            ) : isFiltering ? (
              filteredChoices.length === 0 ? (
                <AppText tone="secondary">No workouts match your search.</AppText>
              ) : (
                filteredChoices.map((choice) => (
                  <Card key={choice.id} onPress={() => props.onSelectWorkout(choice)} style={styles.workoutChoice}>
                    <View style={styles.workoutTitleGroup}>
                      <AppText variant="bodyStrong">{choice.workout.name}</AppText>
                      <AppText variant="meta" tone="secondary">
                        {getAssignableWorkoutDescription(choice)} · {choice.category}
                      </AppText>
                    </View>
                    <AppText variant="meta" tone="accent">
                      Use
                    </AppText>
                  </Card>
                ))
              )
            ) : (
              props.groups.map((group) => (
                <View key={group.title} style={styles.workoutGroup}>
                  <AppText variant="headline">{group.title}</AppText>
                  {group.workouts.map((choice) => (
                    <Card key={choice.id} onPress={() => props.onSelectWorkout(choice)} style={styles.workoutChoice}>
                      <View style={styles.workoutTitleGroup}>
                        <AppText variant="bodyStrong">{choice.workout.name}</AppText>
                        <AppText variant="meta" tone="secondary">
                          {getAssignableWorkoutDescription(choice)}
                        </AppText>
                      </View>
                      <AppText variant="meta" tone="accent">
                        Use
                      </AppText>
                    </Card>
                  ))}
                </View>
              ))
            )}
      </ScrollView>
    </ModalSheet>
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
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.lg
  },
  label: {
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
  body: {
    color: colors.textSecondary,
    fontSize: 16,
    lineHeight: 22
  },
  dayOptionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  dayOption: {
    alignItems: "center",
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    minWidth: 52,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  pressedTile: {
    opacity: 0.92,
    transform: [{ scale: 0.98 }]
  },
  selectedDayOption: {
    backgroundColor: colors.accentStrong,
    borderColor: colors.accentStrong
  },
  dayOptionText: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "600"
  },
  selectedDayOptionText: {
    color: colors.surface
  },
  dayCard: {
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md
  },
  dayHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between"
  },
  dayActions: {
    flexDirection: "row",
    gap: spacing.md
  },
  dayTitleGroup: {
    flex: 1,
    gap: 4
  },
  dayLabel: {
    color: colors.accentStrong,
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase"
  },
  workoutName: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: "600",
    lineHeight: 22
  },
  workoutTitleGroup: {
    flex: 1,
    gap: 4
  },
  searchPanel: {
    gap: spacing.xs
  },
  searchHeaderRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  filterPanel: {
    gap: spacing.xs
  },
  chipRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs
  },
  chipRowLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "700",
    marginRight: spacing.xs,
    textTransform: "uppercase"
  },
  chip: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6
  },
  chipSelected: {
    backgroundColor: colors.accentMuted,
    borderColor: colors.accentStrong
  },
  chipText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: "700"
  },
  chipTextSelected: {
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
    fontSize: 13,
    fontWeight: "700"
  },
  exerciseList: {
    gap: spacing.xs
  },
  exerciseLine: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: "600",
    lineHeight: 21
  },
  exerciseMeta: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 20
  },
  addText: {
    color: colors.accentStrong,
    fontSize: 14,
    fontWeight: "600"
  },
  removeText: {
    color: colors.danger,
    fontSize: 14,
    fontWeight: "600"
  },
  errorText: {
    color: colors.danger,
    fontSize: 14,
    fontWeight: "600"
  },
  rowHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between"
  },
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
  modalTitleGroup: {
    flex: 1,
    gap: spacing.xs
  },
  modalTitle: {
    color: colors.textPrimary,
    fontSize: 24,
    fontWeight: "600"
  },
  workoutChoiceList: {
    gap: spacing.md
  },
  suggestionsLabel: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase"
  },
  workoutGroup: {
    gap: spacing.sm
  },
  groupTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: "600",
    lineHeight: 24
  },
  workoutChoice: {
    alignItems: "center",
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
    padding: spacing.md
  },
  createWorkoutChoice: {
    backgroundColor: colors.accentMuted,
    borderColor: colors.accentStrong
  }
});
