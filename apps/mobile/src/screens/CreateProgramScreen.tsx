import { useMemo, useState } from "react";
import type { CreateCustomProgramRequest, ExerciseCatalogItemDto } from "@fitness/shared";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Screen } from "../components/Screen";
import { PrimaryButton } from "../components/PrimaryButton";
import type { RootStackParamList } from "../core/navigation/navigation-types";
import { useCreateCustomProgram } from "../features/workout/hooks/useCreateCustomProgram";
import { useExercises } from "../features/workout/hooks/useExercises";
import { useFollowProgram } from "../features/workout/hooks/useFollowProgram";
import { colors, spacing } from "../theme/tokens";

type Props = NativeStackScreenProps<RootStackParamList, "CreateProgram">;

type BuilderExercise = {
  exerciseId: string;
  targetSets: string;
  targetReps: string;
};

type BuilderWorkout = {
  id: string;
  name: string;
  exercises: BuilderExercise[];
};

function createBuilderWorkout(index: number): BuilderWorkout {
  return {
    id: `workout-${Date.now()}-${index}`,
    name: index === 0 ? "Day 1" : `Day ${index + 1}`,
    exercises: []
  };
}

function normalizePositiveInteger(value: string) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export function CreateProgramScreen({ navigation }: Props) {
  const [programName, setProgramName] = useState("");
  const [workouts, setWorkouts] = useState<BuilderWorkout[]>([createBuilderWorkout(0)]);
  const [exercisePickerWorkoutId, setExercisePickerWorkoutId] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [savedProgramId, setSavedProgramId] = useState<string | null>(null);
  const exercisesQuery = useExercises(Boolean(exercisePickerWorkoutId));
  const createProgramMutation = useCreateCustomProgram();
  const followProgramMutation = useFollowProgram();

  const exerciseById = useMemo(() => {
    const map = new Map<string, ExerciseCatalogItemDto>();
    for (const exercise of exercisesQuery.data ?? []) {
      map.set(exercise.id, exercise);
    }
    return map;
  }, [exercisesQuery.data]);

  function updateWorkoutName(workoutId: string, name: string) {
    setWorkouts((current) =>
      current.map((workout) => (workout.id === workoutId ? { ...workout, name } : workout))
    );
  }

  function removeWorkout(workoutId: string) {
    setWorkouts((current) => current.filter((workout) => workout.id !== workoutId));
  }

  function addExerciseToWorkout(workoutId: string, exerciseId: string) {
    setWorkouts((current) =>
      current.map((workout) => {
        if (workout.id !== workoutId || workout.exercises.some((exercise) => exercise.exerciseId === exerciseId)) {
          return workout;
        }

        return {
          ...workout,
          exercises: [
            ...workout.exercises,
            {
              exerciseId,
              targetSets: "3",
              targetReps: "8"
            }
          ]
        };
      })
    );
    setExercisePickerWorkoutId(null);
  }

  function updateExerciseTarget(
    workoutId: string,
    exerciseId: string,
    field: "targetSets" | "targetReps",
    value: string
  ) {
    setWorkouts((current) =>
      current.map((workout) =>
        workout.id === workoutId
          ? {
              ...workout,
              exercises: workout.exercises.map((exercise) =>
                exercise.exerciseId === exerciseId ? { ...exercise, [field]: value } : exercise
              )
            }
          : workout
      )
    );
  }

  function removeExercise(workoutId: string, exerciseId: string) {
    setWorkouts((current) =>
      current.map((workout) =>
        workout.id === workoutId
          ? {
              ...workout,
              exercises: workout.exercises.filter((exercise) => exercise.exerciseId !== exerciseId)
            }
          : workout
      )
    );
  }

  function buildRequest(): CreateCustomProgramRequest | null {
    const name = programName.trim();
    if (!name) {
      setValidationError("Program name is required.");
      return null;
    }

    if (workouts.length === 0) {
      setValidationError("Add at least one workout day.");
      return null;
    }

    const requestWorkouts = [];
    for (const workout of workouts) {
      const workoutName = workout.name.trim();
      if (!workoutName) {
        setValidationError("Each workout day needs a name.");
        return null;
      }

      if (workout.exercises.length === 0) {
        setValidationError(`${workoutName} needs at least one exercise.`);
        return null;
      }

      const requestExercises = [];
      for (const exercise of workout.exercises) {
        const targetSets = normalizePositiveInteger(exercise.targetSets);
        const targetReps = normalizePositiveInteger(exercise.targetReps);
        if (!targetSets || !targetReps) {
          setValidationError("Sets and reps must be positive numbers.");
          return null;
        }

        requestExercises.push({
          exerciseId: exercise.exerciseId,
          targetSets,
          targetReps
        });
      }

      requestWorkouts.push({
        name: workoutName,
        exercises: requestExercises
      });
    }

    setValidationError(null);
    return {
      name,
      workouts: requestWorkouts
    };
  }

  function handleSaveProgram() {
    const request = buildRequest();
    if (!request) {
      return;
    }

    createProgramMutation.mutate(request, {
      onSuccess: (response) => {
        setSavedProgramId(response.data.program.id);
      }
    });
  }

  const selectedWorkout = workouts.find((workout) => workout.id === exercisePickerWorkoutId) ?? null;
  const pickerExercises =
    selectedWorkout && exercisesQuery.data
      ? exercisesQuery.data.filter(
          (exercise) => !selectedWorkout.exercises.some((selected) => selected.exerciseId === exercise.id)
        )
      : [];

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Create Program</Text>
        <Text style={styles.title}>Build a reusable workout plan.</Text>
        <Text style={styles.subtitle}>Name the program, add workout days, then choose exercises and targets.</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Program name</Text>
        <TextInput
          autoCapitalize="words"
          onChangeText={setProgramName}
          placeholder="Push Pull Legs"
          placeholderTextColor={colors.textSecondary}
          style={styles.input}
          value={programName}
        />
      </View>

      {workouts.map((workout, workoutIndex) => (
        <View key={workout.id} style={styles.card}>
          <View style={styles.rowHeader}>
            <Text style={styles.label}>Workout day</Text>
            {workouts.length > 1 ? (
              <Pressable accessibilityRole="button" onPress={() => removeWorkout(workout.id)}>
                <Text style={styles.removeText}>Remove</Text>
              </Pressable>
            ) : null}
          </View>
          <TextInput
            autoCapitalize="words"
            onChangeText={(name) => updateWorkoutName(workout.id, name)}
            placeholder={`Day ${workoutIndex + 1}`}
            placeholderTextColor={colors.textSecondary}
            style={styles.input}
            value={workout.name}
          />

          {workout.exercises.length === 0 ? (
            <Text style={styles.body}>Add at least one exercise to this day.</Text>
          ) : (
            workout.exercises.map((exercise) => {
              const catalogExercise = exerciseById.get(exercise.exerciseId);

              return (
                <View key={exercise.exerciseId} style={styles.exerciseRow}>
                  <View style={styles.exerciseTitleGroup}>
                    <Text style={styles.exerciseName}>{catalogExercise?.name ?? "Exercise"}</Text>
                    <Text style={styles.exerciseMeta}>
                      {[catalogExercise?.category, catalogExercise?.primaryMuscleGroup].filter(Boolean).join(" - ")}
                    </Text>
                  </View>
                  <View style={styles.targetInputs}>
                    <TextInput
                      keyboardType="number-pad"
                      onChangeText={(value) =>
                        updateExerciseTarget(workout.id, exercise.exerciseId, "targetSets", value)
                      }
                      style={styles.targetInput}
                      value={exercise.targetSets}
                    />
                    <Text style={styles.targetSeparator}>x</Text>
                    <TextInput
                      keyboardType="number-pad"
                      onChangeText={(value) =>
                        updateExerciseTarget(workout.id, exercise.exerciseId, "targetReps", value)
                      }
                      style={styles.targetInput}
                      value={exercise.targetReps}
                    />
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => removeExercise(workout.id, exercise.exerciseId)}
                  >
                    <Text style={styles.removeText}>Remove</Text>
                  </Pressable>
                </View>
              );
            })
          )}

          <PrimaryButton
            label="Add exercise"
            tone="secondary"
            onPress={() => setExercisePickerWorkoutId(workout.id)}
          />
        </View>
      ))}

      <PrimaryButton
        label="Add workout day"
        tone="secondary"
        onPress={() => setWorkouts((current) => [...current, createBuilderWorkout(current.length)])}
      />

      {validationError ? <Text style={styles.errorText}>{validationError}</Text> : null}
      {createProgramMutation.error instanceof Error ? (
        <Text style={styles.errorText}>{createProgramMutation.error.message}</Text>
      ) : null}
      {followProgramMutation.error instanceof Error ? (
        <Text style={styles.errorText}>{followProgramMutation.error.message}</Text>
      ) : null}

      {savedProgramId ? (
        <View style={styles.card}>
          <Text style={styles.label}>Saved</Text>
          <Text style={styles.body}>Your program is ready to follow.</Text>
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
          label="Save Program"
          loading={createProgramMutation.isPending}
          onPress={handleSaveProgram}
        />
      )}

      <ExercisePickerModal
        exercises={pickerExercises}
        loading={exercisesQuery.isLoading}
        visible={Boolean(exercisePickerWorkoutId)}
        workoutId={exercisePickerWorkoutId}
        onClose={() => setExercisePickerWorkoutId(null)}
        onSelectExercise={addExerciseToWorkout}
      />
    </Screen>
  );
}

function ExercisePickerModal(props: {
  exercises: ExerciseCatalogItemDto[];
  loading: boolean;
  visible: boolean;
  workoutId: string | null;
  onClose: () => void;
  onSelectExercise: (workoutId: string, exerciseId: string) => void;
}) {
  return (
    <Modal animationType="slide" transparent visible={props.visible} onRequestClose={props.onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalSheet}>
          <View style={styles.rowHeader}>
            <View style={styles.modalTitleGroup}>
              <Text style={styles.label}>Add exercise</Text>
              <Text style={styles.modalTitle}>Exercise list</Text>
            </View>
            <Pressable accessibilityRole="button" onPress={props.onClose}>
              <Text style={styles.removeText}>Close</Text>
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.exerciseChoiceList}>
            {props.loading ? (
              <Text style={styles.body}>Loading exercises...</Text>
            ) : props.exercises.length === 0 ? (
              <Text style={styles.body}>No more exercises are available for this day.</Text>
            ) : (
              props.exercises.map((exercise) => (
                <Pressable
                  accessibilityRole="button"
                  key={exercise.id}
                  onPress={() => {
                    if (props.workoutId) {
                      props.onSelectExercise(props.workoutId, exercise.id);
                    }
                  }}
                  style={styles.exerciseChoice}
                >
                  <View style={styles.exerciseTitleGroup}>
                    <Text style={styles.exerciseName}>{exercise.name}</Text>
                    <Text style={styles.exerciseMeta}>
                      {[exercise.category, exercise.primaryMuscleGroup, exercise.equipmentType]
                        .filter(Boolean)
                        .join(" - ")}
                    </Text>
                  </View>
                  <Text style={styles.addText}>Add</Text>
                </Pressable>
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
    fontWeight: "700",
    textTransform: "uppercase"
  },
  title: {
    color: colors.textPrimary,
    fontSize: 28,
    fontWeight: "800",
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
    borderRadius: 22,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.lg
  },
  label: {
    color: colors.accentStrong,
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase"
  },
  input: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: "700",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  body: {
    color: colors.textSecondary,
    fontSize: 16,
    lineHeight: 22
  },
  rowHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between"
  },
  exerciseRow: {
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md
  },
  exerciseTitleGroup: {
    flex: 1,
    gap: 4
  },
  exerciseName: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: "800",
    lineHeight: 22
  },
  exerciseMeta: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 20,
    textTransform: "capitalize"
  },
  targetInputs: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm
  },
  targetInput: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: 14,
    borderWidth: 1,
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "800",
    minWidth: 64,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    textAlign: "center"
  },
  targetSeparator: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "800"
  },
  removeText: {
    color: "#9c3b31",
    fontSize: 14,
    fontWeight: "800"
  },
  addText: {
    color: colors.accentStrong,
    fontSize: 14,
    fontWeight: "800"
  },
  errorText: {
    color: "#9c3b31",
    fontSize: 14,
    fontWeight: "700"
  },
  modalBackdrop: {
    alignItems: "center",
    backgroundColor: "rgba(29, 36, 28, 0.45)",
    flex: 1,
    justifyContent: "flex-end",
    padding: spacing.md
  },
  modalSheet: {
    backgroundColor: colors.surface,
    borderRadius: 24,
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
    fontWeight: "800"
  },
  exerciseChoiceList: {
    gap: spacing.sm
  },
  exerciseChoice: {
    alignItems: "center",
    borderColor: colors.border,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
    padding: spacing.md
  }
});
