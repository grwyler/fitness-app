import type { ExerciseCatalogItemDto } from "@fitness/shared";
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
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

export function CustomExercisePickerModal(props: {
  errorMessage: string | null;
  exercises: ExerciseCatalogItemDto[];
  loadingExercises: boolean;
  mode: CustomWorkoutBuilderMode;
  programDayNumber?: number | null;
  selectedExerciseIds: string[];
  workoutName?: string;
  submitting: boolean;
  visible: boolean;
  onChangeWorkoutName?: (value: string) => void;
  onClose: () => void;
  onStart: () => void;
  onToggleExercise: (exerciseId: string) => void;
}) {
  const selectedExerciseIds = new Set(props.selectedExerciseIds);

  return (
    <Modal animationType="slide" transparent visible={props.visible} onRequestClose={props.onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalSheet}>
          <View style={styles.modalHeader}>
            <View style={styles.modalTitleGroup}>
              <Text style={styles.cardLabel}>Custom workout</Text>
              <Text style={styles.modalTitle}>Choose exercises</Text>
              <Text style={styles.cardBody}>
                Selected exercises start with {CUSTOM_WORKOUT_DEFAULT_TARGET_SETS} x{" "}
                {CUSTOM_WORKOUT_DEFAULT_TARGET_REPS}. You can add or remove sets while logging.
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
            <Pressable accessibilityRole="button" onPress={props.onClose} style={styles.closeButton}>
              <Text style={styles.closeLabel}>Close</Text>
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.exerciseChoiceList}>
            {props.loadingExercises ? (
              <Text style={styles.cardBody}>Loading exercises...</Text>
            ) : props.exercises.length === 0 ? (
              <Text style={styles.cardBody}>No exercises are available yet.</Text>
            ) : (
              props.exercises.map((exercise) => {
                const isSelected = selectedExerciseIds.has(exercise.id);

                return (
                  <Pressable
                    accessibilityRole="button"
                    key={exercise.id}
                    onPress={() => props.onToggleExercise(exercise.id)}
                    style={[styles.exerciseChoice, isSelected && styles.selectedExerciseChoice]}
                  >
                    <View style={styles.exerciseChoiceText}>
                      <Text style={styles.exerciseName}>{exercise.name}</Text>
                      <Text style={styles.exerciseMeta}>
                        {[exercise.category, exercise.primaryMuscleGroup, exercise.equipmentType]
                          .filter(Boolean)
                          .join(" - ")}
                      </Text>
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
          <PrimaryButton
            label={getCustomExercisePickerActionLabel({
              selectedExerciseCount: props.selectedExerciseIds.length,
              mode: props.mode,
              programDayNumber: props.programDayNumber
            })}
            disabled={props.submitting || props.loadingExercises}
            loading={props.submitting}
            onPress={props.onStart}
          />
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
  errorText: {
    color: colors.danger,
    fontSize: 14,
    fontWeight: "600"
  }
});
