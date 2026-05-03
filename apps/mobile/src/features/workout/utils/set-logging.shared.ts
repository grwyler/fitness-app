import {
  MATERIAL_OVERPERFORMANCE_MULTIPLIER,
  formatWeightForUser,
  parseWeightInputForUser,
  type LogSetRequest,
  type SetDto,
  type UnitSystem,
  type WeightValueDto
} from "@fitness/shared";

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
  unitSystem?: UnitSystem;
}): SetLogDraft {
  const previousSet = input.previousSet;
  const sourceReps =
    previousSet?.actualReps !== null && previousSet?.actualReps !== undefined
      ? previousSet.actualReps
      : input.set.actualReps ?? input.set.targetReps;
  const sourceWeight =
    previousSet?.actualWeight?.value ?? input.set.actualWeight?.value ?? input.set.targetWeight.value;
  const unitSystem = input.unitSystem ?? "imperial";

  return {
    repsText: sourceReps.toString(),
    weightText: formatWeightForUser({
      weightLbs: sourceWeight,
      unitSystem,
      includeUnit: false,
      maximumFractionDigits: unitSystem === "metric" ? 1 : 2
    }).text
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

export function validateSetLogDraft(draft: SetLogDraft, input?: { unitSystem?: UnitSystem }): SetLogValidation {
  const trimmedReps = draft.repsText.trim();
  const trimmedWeight = draft.weightText.trim();
  const actualReps = trimmedReps.length > 0 ? Number(trimmedReps) : null;
  const unitSystem = input?.unitSystem ?? "imperial";
  const weightValueLbs =
    trimmedWeight.length > 0 ? parseWeightInputForUser({ weightText: trimmedWeight, unitSystem }) : null;

  if (actualReps === null || !Number.isInteger(actualReps) || actualReps < 0) {
    return {
      actualReps: null,
      actualWeight: null,
      error: "Enter reps as a whole number."
    };
  }

  if (weightValueLbs === null || !Number.isFinite(weightValueLbs) || weightValueLbs < 0) {
    return {
      actualReps,
      actualWeight: null,
      error: "Enter a valid load."
    };
  }

  return {
    actualReps,
    actualWeight: {
      value: weightValueLbs,
      unit: "lb"
    },
    error: null
  };
}

export function buildLogSetRequestFromDraft(
  draft: SetLogDraft,
  input?: { unitSystem?: UnitSystem }
): LogSetRequest | null {
  const validation = validateSetLogDraft(draft, input);
  if (validation.error || validation.actualReps === null || validation.actualWeight === null) {
    return null;
  }

  return {
    actualReps: validation.actualReps,
    actualWeight: validation.actualWeight
  };
}

export function isMaterialOverperformanceLog(input: {
  actualReps: number;
  actualWeightValue: number;
  targetWeightValue: number;
}) {
  return (
    input.actualReps > 0 &&
    input.targetWeightValue > 0 &&
    input.actualWeightValue >= input.targetWeightValue * MATERIAL_OVERPERFORMANCE_MULTIPLIER
  );
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

export function getRestTimerSecondsRemaining(input: { endAtMs: number; nowMs?: number }) {
  const nowMs = input.nowMs ?? Date.now();
  return Math.max(0, Math.ceil((input.endAtMs - nowMs) / 1000));
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
  actualWeightValue?: number | null;
  targetWeightValue?: number | null;
}) {
  if (input.actualReps === null) {
    return "Ready";
  }

  if (
    input.actualWeightValue !== null &&
    input.actualWeightValue !== undefined &&
    input.targetWeightValue !== null &&
    input.targetWeightValue !== undefined &&
    input.actualReps < input.targetReps &&
    isMaterialOverperformanceLog({
      actualReps: input.actualReps,
      actualWeightValue: input.actualWeightValue,
      targetWeightValue: input.targetWeightValue
    })
  ) {
    return "Heavy work";
  }

  return input.actualReps >= input.targetReps ? "Meets target" : "Below target";
}
