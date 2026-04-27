import type { LogSetRequest, SetDto, WeightValueDto } from "@fitness/shared";

export type SetLogDraft = {
  repsText: string;
  weightText: string;
};

export type SetLogValidation = {
  actualReps: number | null;
  actualWeight: WeightValueDto | null;
  error: string | null;
};

export function formatSetWeightValue(value: number) {
  return Number.isInteger(value) ? value.toString() : value.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
}

export function adjustWeightText(input: {
  weightText: string;
  delta: number;
}) {
  const currentWeight = Number(input.weightText);
  const baseWeight = Number.isFinite(currentWeight) ? currentWeight : 0;
  return formatSetWeightValue(Math.max(0, baseWeight + input.delta));
}

export function getPreviousLoggedSet(input: {
  sets: SetDto[];
  setNumber: number;
}): SetDto | null {
  return (
    [...input.sets]
      .filter((set) => set.setNumber < input.setNumber && set.status !== "pending")
      .sort((left, right) => right.setNumber - left.setNumber)[0] ?? null
  );
}

export function getSetLogDefaultDraft(input: {
  set: SetDto;
  previousSet?: SetDto | null;
}): SetLogDraft {
  const previousSet = input.previousSet;
  const sourceReps =
    previousSet?.actualReps !== null && previousSet?.actualReps !== undefined
      ? previousSet.actualReps
      : input.set.actualReps ?? input.set.targetReps;
  const sourceWeight =
    previousSet?.actualWeight?.value ?? input.set.actualWeight?.value ?? input.set.targetWeight.value;

  return {
    repsText: sourceReps.toString(),
    weightText: formatSetWeightValue(sourceWeight)
  };
}

export function normalizeRepsInput(value: string) {
  const digits = value.replace(/[^\d]/g, "");
  return digits.replace(/^0+(?=\d)/, "");
}

export function normalizeWeightInput(value: string) {
  const normalized = value.replace(/[^\d.]/g, "");
  const [whole = "", ...fractionParts] = normalized.split(".");
  const fraction = fractionParts.join("").slice(0, 2);
  if (fractionParts.length === 0) {
    return whole.replace(/^0+(?=\d)/, "");
  }

  return `${whole.replace(/^0+(?=\d)/, "") || "0"}.${fraction}`;
}

export function validateSetLogDraft(draft: SetLogDraft): SetLogValidation {
  const trimmedReps = draft.repsText.trim();
  const trimmedWeight = draft.weightText.trim();
  const actualReps = trimmedReps.length > 0 ? Number(trimmedReps) : null;
  const weightValue = trimmedWeight.length > 0 ? Number(trimmedWeight) : null;

  if (actualReps === null || !Number.isInteger(actualReps) || actualReps < 0) {
    return {
      actualReps: null,
      actualWeight: null,
      error: "Enter reps as a whole number."
    };
  }

  if (weightValue === null || !Number.isFinite(weightValue) || weightValue < 0) {
    return {
      actualReps,
      actualWeight: null,
      error: "Enter a valid load."
    };
  }

  return {
    actualReps,
    actualWeight: {
      value: weightValue,
      unit: "lb"
    },
    error: null
  };
}

export function buildLogSetRequestFromDraft(draft: SetLogDraft): LogSetRequest | null {
  const validation = validateSetLogDraft(draft);
  if (validation.error || validation.actualReps === null || validation.actualWeight === null) {
    return null;
  }

  return {
    actualReps: validation.actualReps,
    actualWeight: validation.actualWeight
  };
}

export function getRestDurationSeconds(input: {
  restSeconds: number | null;
  exerciseCategory?: string;
}) {
  if (typeof input.restSeconds === "number" && input.restSeconds > 0) {
    return input.restSeconds;
  }

  return input.exerciseCategory === "accessory" ? 75 : 120;
}

export function formatRestTimer(secondsRemaining: number) {
  const safeSeconds = Math.max(0, Math.ceil(secondsRemaining));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function getSetStatusLabel(set: SetDto) {
  if (set.status === "completed") {
    return "Done";
  }

  if (set.status === "failed") {
    return "Missed reps";
  }

  if (set.status === "skipped") {
    return "Skipped";
  }

  return "Not logged";
}

export function getSetOutcomeText(input: {
  actualReps: number | null;
  targetReps: number;
}) {
  if (input.actualReps === null) {
    return "Ready";
  }

  return input.actualReps >= input.targetReps ? "Meets target" : "Below target";
}
