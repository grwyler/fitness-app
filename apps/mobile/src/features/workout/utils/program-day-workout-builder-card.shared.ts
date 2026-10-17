export const EXERCISE_CARD_LAYOUT_VARIANT = "stacked_v1" as const;
export const WORKOUT_CARD_LAYOUT_VARIANT = "stacked_v1" as const;

export function getExerciseEntryPrimaryActionLabels() {
  return {
    edit: "Edit",
    more: "More"
  } as const;
}

export function getExerciseEntryOverflowActionLabels() {
  return {
    moveUp: "Move up",
    moveDown: "Move down",
    remove: "Remove exercise"
  } as const;
}

export function getWorkoutEntryPrimaryActionLabels() {
  return {
    addExercise: "Add exercise",
    more: "More"
  } as const;
}

export function getWorkoutEntryOverflowActionLabels() {
  return {
    moveUp: "Move up",
    moveDown: "Move down",
    duplicate: "Duplicate workout",
    remove: "Remove workout"
  } as const;
}

export function getWorkoutCardActionVisibility(input: { isEmpty: boolean }) {
  if (input.isEmpty) {
    return {
      showHeaderAddExercise: true,
      showHeaderMore: true,
      showFooterAddExercise: false
    } as const;
  }

  return {
    showHeaderAddExercise: false,
    showHeaderMore: true,
    showFooterAddExercise: true
  } as const;
}
