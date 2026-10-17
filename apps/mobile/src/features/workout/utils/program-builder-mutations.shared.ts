import type { ProgramWorkoutExerciseDto, ProgramWorkoutTemplateDto } from "@fitness/shared";

export function removeExerciseFromWorkoutTemplate(input: {
  workout: ProgramWorkoutTemplateDto;
  entryId: ProgramWorkoutExerciseDto["id"];
}): ProgramWorkoutTemplateDto {
  const kept = input.workout.exercises
    .filter((entry) => entry.id !== input.entryId)
    .sort((left, right) => left.sequenceOrder - right.sequenceOrder)
    .map((entry, index) => ({
      ...entry,
      sequenceOrder: index + 1
    }));

  return {
    ...input.workout,
    exercises: kept
  };
}

