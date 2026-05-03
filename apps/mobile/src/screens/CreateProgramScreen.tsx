import { useEffect, useMemo, useState } from "react";
import { generateCustomWorkoutNameFromExercises } from "@fitness/shared";
import type { AddCustomWorkoutExerciseRequest, ProgramDto, ProgramWorkoutTemplateDto } from "@fitness/shared";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { AppText } from "../components/AppText";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { Chip } from "../components/Chip";
import { Input } from "../components/Input";
import { ListRow } from "../components/ListRow";
import { ModalSheet } from "../components/ModalSheet";
import { Screen } from "../components/Screen";
import { PrimaryButton } from "../components/PrimaryButton";
import { CustomExercisePickerModal } from "../features/workout/components/CustomExercisePickerModal";
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
  buildCustomWorkoutExerciseRequestsFromProgramWorkout,
  createProgramDayAssignments,
  getAssignableWorkoutDescription,
  getAssignableWorkoutChoices,
  groupAssignableWorkoutChoices,
  resizeProgramDayAssignments,
  type CustomExercisePickerRequest,
  type AssignableWorkoutChoice,
  type AssignableWorkoutGroup,
  type ProgramDayAssignment
} from "../features/workout/utils/program-creator.shared";
import { getHiddenExerciseCount, getPlannedExerciseLines } from "../features/workout/utils/dashboard-program.shared";
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
  const [pickerDayNumber, setPickerDayNumber] = useState<number | null>(null);
  const [customWorkoutDayNumber, setCustomWorkoutDayNumber] = useState<number | null>(null);
  const [customWorkoutName, setCustomWorkoutName] = useState("");
  const [customExerciseError, setCustomExerciseError] = useState<string | null>(null);
  const [customWorkoutInitialRequests, setCustomWorkoutInitialRequests] = useState<
    CustomExercisePickerRequest[] | null
  >(null);
  const [editingWorkoutTemplateId, setEditingWorkoutTemplateId] = useState<string | null>(null);
  const [customWorkoutInitKey, setCustomWorkoutInitKey] = useState(0);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [savedProgramId, setSavedProgramId] = useState<string | null>(null);
  const [autoFollowPending, setAutoFollowPending] = useState(false);
  const [loadedSourceProgramId, setLoadedSourceProgramId] = useState<string | null>(null);
  const dashboardQuery = useDashboard();
  const trainingSettingsQuery = useTrainingSettings();
  const programsQuery = usePrograms();
  const exercisesQuery = useExercises(customWorkoutDayNumber !== null);
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
    setEditingWorkoutTemplateId(null);
    setCustomWorkoutInitKey((current) => current + 1);
  }

  function openCustomWorkoutEditorForDay(dayNumber: number, workout: ProgramWorkoutTemplateDto) {
    setPickerDayNumber(null);
    setSavedProgramId(null);
    setCustomWorkoutDayNumber(dayNumber);
    setCustomWorkoutName(workout.name);
    setCustomExerciseError(null);
    setCustomWorkoutInitialRequests(buildCustomWorkoutExerciseRequestsFromProgramWorkout(workout));
    setEditingWorkoutTemplateId(isEditing && editProgram?.source === "custom" ? workout.id : null);
    setCustomWorkoutInitKey((current) => current + 1);
  }

  function closeCustomWorkoutBuilder() {
    setCustomWorkoutDayNumber(null);
    setCustomWorkoutName("");
    setCustomExerciseError(null);
    setCustomWorkoutInitialRequests(null);
    setEditingWorkoutTemplateId(null);
  }

  function assignCustomWorkoutToDay(input: {
    requests: CustomExercisePickerRequest[];
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
    const workoutId = editingWorkoutTemplateId ?? `custom-builder:${workoutIdSuffix}`;

    assignWorkoutToDay(customWorkoutDayNumber, {
      id: workoutId,
      name: workoutName,
      category: "Full Body",
      sequenceOrder: 1,
      estimatedDurationMinutes: null,
      exercises: input.requests.map((request, index) => {
        const exercise = exercisesById.get(request.exerciseId)!;
        return {
          id: request.workoutTemplateExerciseEntryId ?? `custom-builder:${request.exerciseId}:${index + 1}`,
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
              <ListRow
                title={`Day ${day.dayNumber}`}
                subtitle={day.workout ? day.workout.name : "Needs workout"}
                variant={day.workout ? "default" : "muted"}
                right={
                  <View style={styles.dayActions}>
                    {day.workout ? (
                      <Button
                        label="Edit"
                        onPress={() => openCustomWorkoutEditorForDay(day.dayNumber, day.workout!)}
                        variant="ghost"
                        fullWidth={false}
                        size="sm"
                      />
                    ) : null}
                    <Button
                      label={day.workout ? "Change" : "Choose"}
                      onPress={() => setPickerDayNumber(day.dayNumber)}
                      variant="secondary"
                      fullWidth={false}
                      size="sm"
                    />
                  </View>
                }
              />
              {day.workout ? (
                <View style={styles.dayPreview}>
                  <WorkoutPreview workout={day.workout} />
                </View>
              ) : (
                <AppText variant="caption" tone="secondary">
                  Choose a workout for this day - you can change it later.
                </AppText>
              )}
            </View>
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
        unitSystem={unitSystem}
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
        <Button label="Close" onPress={props.onClose} variant="ghost" fullWidth={false} size="sm" />
      }
      onClose={props.onClose}
      subtitle="Build workout"
      title="Create a workout"
      visible={props.visible}
    >
      <ScrollView contentContainerStyle={styles.workoutChoiceList}>
        <View style={styles.searchPanel}>
          <View style={styles.searchHeaderRow}>
            <AppText variant="sectionLabel" tone="accent">
              Search workouts
            </AppText>
            <Button
              label={filtersExpanded ? "Hide filters" : categoryFilter || lengthFilter !== "any" ? "Filters (on)" : "Filters"}
              onPress={() => setFiltersExpanded((current) => !current)}
              variant="ghost"
              fullWidth={false}
              size="sm"
            />
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
                <AppText variant="overline" tone="secondary">
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
                <AppText variant="overline" tone="secondary">
                  Length
                </AppText>
                {(["any", "quick", "standard", "long"] as const).map((value) => (
                  <Chip
                    key={`len:${value}`}
                    label={
                      value === "any"
                        ? "Any"
                        : value === "quick"
                          ? "Quick (≤3)"
                          : value === "standard"
                            ? "Standard (4–6)"
                            : "Long (7+)"
                    }
                    selected={lengthFilter === value}
                    onPress={() => setLengthFilter(value)}
                  />
                ))}

                {categoryFilter || lengthFilter !== "any" ? (
                  <Chip label="Clear" variant="muted" onPress={clearFilters} />
                ) : null}
              </View>
            </View>
          ) : null}
        </View>

        <Card
          onPress={props.onCreateCustomWorkout}
          variant="hero"
          padding="md"
          contentStyle={styles.createWorkoutChoice}
        >
          <View style={styles.workoutTitleGroup}>
            <AppText variant="bodyStrong">Create a workout</AppText>
            <AppText variant="meta" tone="secondary">
              Choose the exact exercises you want for this day.
            </AppText>
          </View>
          <Chip label="Create" variant="selected" />
        </Card>

        <AppText variant="overline" tone="secondary">
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
              <ListRow
                key={choice.id}
                title={choice.workout.name}
                subtitle={`${getAssignableWorkoutDescription(choice)} · ${choice.category}`}
                onPress={() => props.onSelectWorkout(choice)}
                right={<Chip label="Use" variant="selected" />}
              />
            ))
          )
        ) : (
          props.groups.map((group) => (
            <View key={group.title} style={styles.workoutGroup}>
              <AppText variant="headline">{group.title}</AppText>
              {group.workouts.map((choice) => (
                <ListRow
                  key={choice.id}
                  title={choice.workout.name}
                  subtitle={getAssignableWorkoutDescription(choice)}
                  onPress={() => props.onSelectWorkout(choice)}
                  right={<Chip label="Use" variant="selected" />}
                />
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
  },
  dayPreview: {
    paddingLeft: spacing.md
  },
  dayActions: {
    flexDirection: "row",
    gap: spacing.md
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
  workoutChoiceList: {
    gap: spacing.md,
    paddingBottom: spacing.lg
  },
  workoutGroup: {
    gap: spacing.sm
  },
  createWorkoutChoice: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between"
  }
});
