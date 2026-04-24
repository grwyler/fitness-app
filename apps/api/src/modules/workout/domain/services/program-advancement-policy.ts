import { WorkoutDomainError } from "../errors/workout-domain.error.js";
import type {
  ActiveWorkoutTemplate,
  ProgramAdvancementInput
} from "../models/program-advancement.js";

function sortTemplates(templates: ActiveWorkoutTemplate[]) {
  return [...templates].sort((left, right) => left.sequenceOrder - right.sequenceOrder);
}

export class ProgramAdvancementPolicy {
  public resolveInitialTemplateId(templates: ActiveWorkoutTemplate[]) {
    const orderedTemplates = sortTemplates(templates);
    const firstTemplate = orderedTemplates[0];

    if (!firstTemplate) {
      throw new WorkoutDomainError("UNKNOWN_EXERCISE_ENTRY", "At least one active template is required.");
    }

    return firstTemplate.id;
  }

  public resolveNextTemplateId(input: ProgramAdvancementInput) {
    const orderedTemplates = sortTemplates(input.templates);
    const currentTemplateId = input.currentTemplateId ?? this.resolveInitialTemplateId(orderedTemplates);

    if (input.workoutSessionStatus !== "completed") {
      return currentTemplateId;
    }

    const completedTemplateId = input.completedTemplateId;
    if (!completedTemplateId) {
      throw new WorkoutDomainError(
        "UNKNOWN_EXERCISE_ENTRY",
        "completedTemplateId is required when a completed session advances the program."
      );
    }

    const completedTemplateIndex = orderedTemplates.findIndex((template) => template.id === completedTemplateId);
    if (completedTemplateIndex === -1) {
      throw new WorkoutDomainError(
        "UNKNOWN_EXERCISE_ENTRY",
        "Completed template must be one of the active program templates."
      );
    }

    const nextTemplate = orderedTemplates[completedTemplateIndex + 1] ?? orderedTemplates[0];
    if (!nextTemplate) {
      throw new WorkoutDomainError("UNKNOWN_EXERCISE_ENTRY", "At least one active template is required.");
    }

    return nextTemplate.id;
  }
}

