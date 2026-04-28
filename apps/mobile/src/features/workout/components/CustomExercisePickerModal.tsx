import type { ExerciseCatalogItemDto } from "@fitness/shared";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { PrimaryButton } from "../../../components/PrimaryButton";
import { colors, spacing } from "../../../theme/tokens";
import {
  CUSTOM_WORKOUT_DEFAULT_TARGET_REPS,
  CUSTOM_WORKOUT_DEFAULT_TARGET_SETS
} from "../hooks/useCustomWorkoutExercises";

export function CustomExercisePickerModal(props: {
  errorMessage: string | null;
  exercises: ExerciseCatalogItemDto[];
  loadingExercises: boolean;
  selectedExerciseIds: string[];
  submitting: boolean;
  visible: boolean;
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
            label={
              props.selectedExerciseIds.length === 0
                ? "Choose at least one exercise"
                : `Start with ${props.selectedExerciseIds.length} exercise${
                    props.selectedExerciseIds.length === 1 ? "" : "s"
                  }`
            }
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
    fontWeight: "700",
    textTransform: "uppercase"
  },
  modalTitle: {
    color: colors.textPrimary,
    fontSize: 24,
    fontWeight: "800"
  },
  cardBody: {
    color: colors.textSecondary,
    fontSize: 16,
    lineHeight: 22
  },
  closeButton: {
    paddingVertical: spacing.xs
  },
  closeLabel: {
    color: colors.accentStrong,
    fontSize: 15,
    fontWeight: "700"
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
  selectState: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: "800"
  },
  selectedState: {
    color: colors.accentStrong
  },
  errorText: {
    color: "#9c3b31",
    fontSize: 14,
    fontWeight: "700"
  }
});
