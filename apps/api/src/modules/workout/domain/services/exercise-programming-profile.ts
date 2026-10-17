import type { ExerciseCategory } from "@fitness/shared";

export type ExerciseProgrammingClass =
  | "heavy_technical_compound"
  | "general_compound"
  | "stable_compound"
  | "isolation"
  | "small_muscle_isolation";

export type ExerciseProgrammingProfile = {
  class: ExerciseProgrammingClass;
  repRangeMin: number;
  repRangeMax: number;
  preferRepsBeforeLoad: boolean;
};

/** Resolve sensible defaults from reusable exercise characteristics, never its name. */
export function resolveExerciseProgrammingProfile(input: {
  category: ExerciseCategory;
  movementPattern: string | null;
  equipmentType: string | null;
  primaryMuscleGroup: string | null;
}): ExerciseProgrammingProfile {
  const pattern = input.movementPattern?.toLowerCase() ?? "";
  const equipment = input.equipmentType?.toLowerCase() ?? "";
  const muscle = input.primaryMuscleGroup?.toLowerCase() ?? "";
  if (input.category === "compound" && equipment === "barbell" && ["hinge", "squat", "olympic"].includes(pattern)) {
    return { class: "heavy_technical_compound", repRangeMin: 5, repRangeMax: 8, preferRepsBeforeLoad: true };
  }
  if (input.category === "compound" && ["machine", "cable"].includes(equipment)) {
    return { class: "stable_compound", repRangeMin: 8, repRangeMax: 12, preferRepsBeforeLoad: true };
  }
  if (input.category === "compound") {
    return { class: "general_compound", repRangeMin: 6, repRangeMax: 10, preferRepsBeforeLoad: true };
  }
  if (["calves", "forearms", "rear delts", "rotator cuff"].includes(muscle)) {
    return { class: "small_muscle_isolation", repRangeMin: 12, repRangeMax: 20, preferRepsBeforeLoad: true };
  }
  return { class: "isolation", repRangeMin: 10, repRangeMax: 15, preferRepsBeforeLoad: true };
}
