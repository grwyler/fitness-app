export type CustomWorkoutBuilderMode = "start" | "assignToProgramDay";

export function getCustomExercisePickerActionLabel(input: {
  selectedExerciseCount: number;
  mode: CustomWorkoutBuilderMode;
  programDayNumber?: number | null;
}) {
  if (input.selectedExerciseCount === 0) {
    return "Choose at least one exercise";
  }

  if (input.mode === "assignToProgramDay") {
    if (input.programDayNumber) {
      return `Add to Day ${input.programDayNumber}`;
    }

    return `Use ${input.selectedExerciseCount} Exercise${
      input.selectedExerciseCount === 1 ? "" : "s"
    }`;
  }

  return `Start with ${input.selectedExerciseCount} exercise${
    input.selectedExerciseCount === 1 ? "" : "s"
  }`;
}
