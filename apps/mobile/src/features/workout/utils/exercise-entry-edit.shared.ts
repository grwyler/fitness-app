import type { ProgramWorkoutExerciseDto, UnitSystem } from "@fitness/shared";
import { parseRepTargetText, parseWeightDraft } from "./prescription.shared";

export function parseIntDraft(value: string) {
  if (!value.trim()) {
    return null;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

export function parseDurationTextToSeconds(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  if (trimmed.includes(":")) {
    const parts = trimmed.split(":").map((part) => part.trim());
    if (parts.length !== 2) {
      return null;
    }

    const minutes = Number(parts[0]);
    const seconds = Number(parts[1]);
    if (!Number.isInteger(minutes) || minutes < 0) return null;
    if (!Number.isInteger(seconds) || seconds < 0 || seconds >= 60) return null;

    const total = minutes * 60 + seconds;
    return total > 0 ? total : null;
  }

  const seconds = Number(trimmed);
  if (!Number.isInteger(seconds) || seconds <= 0) {
    return null;
  }

  return seconds;
}

export function parseDistanceDraftToMeters(value: string, unitSystem: UnitSystem): number | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const distanceValue = Number(trimmed);
  if (!Number.isFinite(distanceValue) || distanceValue < 0) {
    return null;
  }

  return unitSystem === "metric" ? distanceValue * 1000 : distanceValue * 1609.344;
}

export function getExerciseEditHelperCopy() {
  return {
    volumeHint: "Want more volume? Increase sets instead of duplicating the exercise."
  } as const;
}

export function getExerciseEditFieldLabels(input: {
  modality: ProgramWorkoutExerciseDto["loggingModality"];
  unitSystem: UnitSystem;
}) {
  const distanceUnit = input.unitSystem === "metric" ? "km" : "mi";

  return {
    sets: "Sets",
    repTarget: "Rep range",
    weight: "Starting weight (optional)",
    duration: "Target duration",
    distance: `Target distance (${distanceUnit})`,
    rounds: "Rounds",
    notes: "Notes (optional)"
  } as const;
}

export type ExerciseEditDraftInput = {
  modality: ProgramWorkoutExerciseDto["loggingModality"];
  unitSystem: UnitSystem;
  setsText: string;
  repsText: string;
  weightText: string;
  durationText: string;
  distanceText: string;
  roundsText: string;
};

export type ExerciseEditDraftResult =
  | {
      ok: true;
      sets: number;
      repDraft: ReturnType<typeof parseRepTargetText> | null;
      weightLbs: number | null;
      durationSeconds: number | null;
      distanceMeters: number | null;
      rounds: number | null;
    }
  | { ok: false; errorMessage: string };

function isRepsModality(modality: ProgramWorkoutExerciseDto["loggingModality"]) {
  return modality === "reps_load" || modality === "reps_only";
}

export function validateExerciseEditDraft(input: ExerciseEditDraftInput): ExerciseEditDraftResult {
  const sets = parseIntDraft(input.setsText);
  if (sets === null || sets < 1) {
    return { ok: false, errorMessage: "Enter at least one set." };
  }
  if (sets > 20) {
    return { ok: false, errorMessage: "Sets must be between 1 and 20." };
  }

  const modality = input.modality;

  if (isRepsModality(modality)) {
    if (!input.repsText.trim()) {
      return { ok: false, errorMessage: "Enter a rep target or range." };
    }

    const repDraft = parseRepTargetText(input.repsText);
    if (!repDraft) {
      return { ok: false, errorMessage: "Enter a rep target or range (e.g. 8, 8-12, AMRAP)." };
    }

    const weightLbs =
      modality === "reps_load" && input.weightText.trim().length > 0
        ? parseWeightDraft({ weightText: input.weightText, unitSystem: input.unitSystem })
        : null;
    if (modality === "reps_load" && input.weightText.trim().length > 0 && weightLbs === null) {
      return { ok: false, errorMessage: "Enter a valid weight." };
    }

    return {
      ok: true,
      sets,
      repDraft,
      weightLbs,
      durationSeconds: null,
      distanceMeters: null,
      rounds: null
    };
  }

  const durationSeconds = input.durationText.trim()
    ? parseDurationTextToSeconds(input.durationText)
    : null;
  if (input.durationText.trim().length > 0 && durationSeconds === null) {
    return { ok: false, errorMessage: "Enter a duration (e.g. 20:00 or 60)." };
  }

  const distanceMeters = input.distanceText.trim()
    ? parseDistanceDraftToMeters(input.distanceText, input.unitSystem)
    : null;
  if (input.distanceText.trim().length > 0 && distanceMeters === null) {
    return { ok: false, errorMessage: "Enter a valid distance." };
  }

  const rounds = input.roundsText.trim() ? parseIntDraft(input.roundsText) : null;
  if (input.roundsText.trim().length > 0 && (rounds === null || rounds < 1 || rounds > 10_000)) {
    return { ok: false, errorMessage: "Enter rounds as a whole number." };
  }

  if (modality === "time" || modality === "hold") {
    if (durationSeconds === null) {
      return { ok: false, errorMessage: "Enter a duration for timed exercises." };
    }
  }

  if (modality === "time_distance") {
    if (durationSeconds === null && distanceMeters === null) {
      return { ok: false, errorMessage: "Enter a distance or duration for cardio." };
    }
  }

  if (modality === "distance") {
    if (distanceMeters === null) {
      return { ok: false, errorMessage: "Enter a distance." };
    }
  }

  if (modality === "interval") {
    if (rounds === null) {
      return { ok: false, errorMessage: "Enter rounds for interval exercises." };
    }
  }

  return {
    ok: true,
    sets,
    repDraft: null,
    weightLbs: null,
    durationSeconds,
    distanceMeters,
    rounds
  };
}

export function getExerciseEditVisibleFields(modality: ProgramWorkoutExerciseDto["loggingModality"]) {
  return {
    sets: true,
    repTarget: modality === "reps_load" || modality === "reps_only",
    weight: modality === "reps_load",
    duration: modality === "time" || modality === "hold" || modality === "time_distance" || modality === "interval",
    distance: modality === "distance" || modality === "time_distance",
    rounds: modality === "interval",
    notes: true
  } as const;
}
