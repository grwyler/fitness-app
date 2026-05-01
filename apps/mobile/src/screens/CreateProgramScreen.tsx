import { useEffect, useMemo, useState } from "react";
import type { AddCustomWorkoutExerciseRequest, ProgramDto, ProgramWorkoutTemplateDto } from "@fitness/shared";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Screen } from "../components/Screen";
import { PrimaryButton } from "../components/PrimaryButton";
import { CustomExercisePickerModal } from "../features/workout/components/CustomExercisePickerModal";
import type { RootStackParamList } from "../core/navigation/navigation-types";
import { useCreateCustomProgram } from "../features/workout/hooks/useCreateCustomProgram";
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
  isProgramDayWorkoutBuilderWorkout,
  resizeProgramDayAssignments,
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
  const [loadedEditProgramId, setLoadedEditProgramId] = useState<string | null>(null);
  const programsQuery = usePrograms();
  const exercisesQuery = useExercises(customWorkoutDayNumber !== null);
  const createProgramMutation = useCreateCustomProgram();
  const updateProgramMutation = useUpdateCustomProgram();
  const followProgramMutation = useFollowProgram();
  const editProgram = useMemo(
    () => (editProgramId ? (programsQuery.data ?? []).find((program) => program.id === editProgramId) ?? null : null),
    [editProgramId, programsQuery.data]
  );
  const isEditing = Boolean(editProgramId);

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
    if (!editProgram || loadedEditProgramId === editProgram.id) {
      return;
    }

    setProgramName(editProgram.name);
    setDaysPerWeek(editProgram.daysPerWeek);
    setDays(buildProgramDayAssignmentsFromProgram(editProgram));
    setSavedProgramId(null);
    setLoadedEditProgramId(editProgram.id);
  }, [editProgram, loadedEditProgramId]);

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
    requests: Array<{
      exerciseId: string;
      targetSets: number;
      targetReps: number;
      targetWeight?: { value: number; unit: "lb" };
    }>;
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
    const workoutName = normalizedName || "Custom Workout";
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
    if (editProgramId) {
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
        setSavedProgramId(response.data.program.id);
      }
    });
  }

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>{isEditing ? "Edit Program" : "Create Program"}</Text>
        <Text style={styles.title}>
          {isEditing ? "Update your weekly training plan." : "Build a weekly plan from workouts."}
        </Text>
        <Text style={styles.subtitle}>
          Name the program, choose training days, then assign a workout to each day.
        </Text>
      </View>

      {isEditing && programsQuery.isLoading ? (
        <Text style={styles.body}>Loading program...</Text>
      ) : null}
      {isEditing && !programsQuery.isLoading && !editProgram ? (
        <Text style={styles.errorText}>We couldn't find that custom program.</Text>
      ) : null}

      <View style={styles.card}>
        <Text style={styles.label}>Program name</Text>
        <TextInput
          autoCapitalize="words"
          onChangeText={(value) => {
            setProgramName(value);
            setSavedProgramId(null);
          }}
          placeholder="Upper Lower Strength"
          placeholderTextColor={colors.textSecondary}
          style={styles.input}
          value={programName}
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Days per week</Text>
        <View style={styles.dayOptionRow}>
          {dayOptions.map((option) => {
            const selected = option === daysPerWeek;

            return (
              <Pressable
                accessibilityRole="button"
                key={option}
                onPress={() => updateDaysPerWeek(option)}
                style={[styles.dayOption, selected && styles.selectedDayOption]}
              >
                <Text style={[styles.dayOptionText, selected && styles.selectedDayOptionText]}>
                  {option}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Program days</Text>
        {programsQuery.isLoading ? (
          <Text style={styles.body}>Loading workouts...</Text>
        ) : (
          days.map((day) => (
            <View key={day.dayNumber} style={styles.dayCard}>
              <View style={styles.dayHeader}>
                <View style={styles.dayTitleGroup}>
                  <Text style={styles.dayLabel}>Day {day.dayNumber}</Text>
                  <Text style={styles.workoutName}>{day.workout?.name ?? "No workout selected"}</Text>
                </View>
                <View style={styles.dayActions}>
                  {day.workout && isProgramDayWorkoutBuilderWorkout(day.workout) ? (
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => openCustomWorkoutEditorForDay(day.dayNumber, day.workout!)}
                    >
                      <Text style={styles.addText}>Edit</Text>
                    </Pressable>
                  ) : null}
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setPickerDayNumber(day.dayNumber)}
                  >
                    <Text style={styles.addText}>{day.workout ? "Change" : "Choose"}</Text>
                  </Pressable>
                </View>
              </View>
              {day.workout ? (
                <WorkoutPreview workout={day.workout} />
              ) : (
                <Text style={styles.body}>Choose a predefined workout or create one from scratch.</Text>
              )}
            </View>
          ))
        )}
        {!hasCustomWorkoutChoices ? (
          <Text style={styles.body}>
            Your Workouts will appear here after custom programs have reusable workout days.
          </Text>
        ) : null}
      </View>

      {validationError ? <Text style={styles.errorText}>{validationError}</Text> : null}
      {programsQuery.error instanceof Error ? (
        <Text style={styles.errorText}>{programsQuery.error.message}</Text>
      ) : null}
      {createProgramMutation.error instanceof Error ? (
        <Text style={styles.errorText}>{createProgramMutation.error.message}</Text>
      ) : null}
      {updateProgramMutation.error instanceof Error ? (
        <Text style={styles.errorText}>{updateProgramMutation.error.message}</Text>
      ) : null}
      {followProgramMutation.error instanceof Error ? (
        <Text style={styles.errorText}>{followProgramMutation.error.message}</Text>
      ) : null}

      {savedProgramId ? (
        <View style={styles.card}>
          <Text style={styles.label}>Saved</Text>
          <Text style={styles.body}>
            {isEditing ? "Your program changes are saved." : "Your program is ready to follow."}
          </Text>
          <PrimaryButton
            label="Follow Program"
            loading={followProgramMutation.isPending}
            onPress={() =>
              followProgramMutation.mutate(savedProgramId, {
                onSuccess: () => navigation.navigate("Dashboard")
              })
            }
          />
        </View>
      ) : (
        <PrimaryButton
          label={isEditing ? "Save Changes" : "Save Program"}
          disabled={programsQuery.isLoading || (isEditing && !editProgram)}
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
      <Text style={styles.exerciseMeta}>
        {props.workout.category} - estimated {props.workout.estimatedDurationMinutes ?? 60} minutes
      </Text>
      {plannedExerciseLines.map((line) => (
        <Text key={line} style={styles.exerciseLine}>
          {line}
        </Text>
      ))}
      {hiddenExerciseCount > 0 ? (
        <Text style={styles.exerciseLine}>+{hiddenExerciseCount} more planned</Text>
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
  return (
    <Modal animationType="slide" transparent visible={props.visible} onRequestClose={props.onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalSheet}>
          <View style={styles.rowHeader}>
            <View style={styles.modalTitleGroup}>
              <Text style={styles.label}>Build workout</Text>
              <Text style={styles.modalTitle}>Create a workout</Text>
            </View>
            <Pressable accessibilityRole="button" onPress={props.onClose}>
              <Text style={styles.removeText}>Close</Text>
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.workoutChoiceList}>
            <Pressable
              accessibilityRole="button"
              onPress={props.onCreateCustomWorkout}
              style={[styles.workoutChoice, styles.createWorkoutChoice]}
            >
              <View style={styles.workoutTitleGroup}>
                <Text style={styles.workoutName}>Create a workout</Text>
                <Text style={styles.exerciseMeta}>Choose the exact exercises you want for this day.</Text>
              </View>
              <Text style={styles.addText}>Create</Text>
            </Pressable>

            <Text style={styles.suggestionsLabel}>Suggested workouts</Text>
            {props.loading ? (
              <Text style={styles.body}>Loading workouts...</Text>
            ) : props.groups.length === 0 ? (
              <Text style={styles.body}>No predefined or reusable workouts are available yet.</Text>
            ) : (
              props.groups.map((group) => (
                <View key={group.title} style={styles.workoutGroup}>
                  <Text style={styles.groupTitle}>{group.title}</Text>
                  {group.workouts.map((choice) => (
                    <Pressable
                      accessibilityRole="button"
                      key={choice.id}
                      onPress={() => props.onSelectWorkout(choice)}
                      style={styles.workoutChoice}
                    >
                      <View style={styles.workoutTitleGroup}>
                        <Text style={styles.workoutName}>{choice.workout.name}</Text>
                        <Text style={styles.exerciseMeta}>{getAssignableWorkoutDescription(choice)}</Text>
                      </View>
                      <Text style={styles.addText}>Use</Text>
                    </Pressable>
                  ))}
                </View>
              ))
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
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
    borderRadius: 12,
    borderWidth: 1,
    minWidth: 52,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
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
    borderRadius: 12,
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
