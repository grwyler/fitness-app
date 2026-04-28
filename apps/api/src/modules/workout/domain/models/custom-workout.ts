export const CUSTOM_WORKOUT_PROGRAM_ID = "22222222-2222-2222-2222-222222222299";
export const CUSTOM_WORKOUT_TEMPLATE_ID = "33333333-3333-3333-3333-333333333399";
export const CUSTOM_WORKOUT_PROGRAM_NAME = "Custom Workout";
export const CUSTOM_WORKOUT_TEMPLATE_NAME = "Custom Workout";

export function isCustomWorkoutProgramId(programId: string) {
  return programId === CUSTOM_WORKOUT_PROGRAM_ID;
}

export function isCustomWorkoutTemplateId(templateId: string) {
  return templateId === CUSTOM_WORKOUT_TEMPLATE_ID;
}
