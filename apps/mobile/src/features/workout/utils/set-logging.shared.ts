import {
  MATERIAL_OVERPERFORMANCE_MULTIPLIER,
  formatWeightForUser,
  parseWeightInputForUser,
  type LogSetRequest,
  type SetFailureStatus,
  type SetRir,
  type SetDto,
  type UnitSystem,
  type WeightValueDto
} from "@fitness/shared";

export type SetLogDraft = {
  repsText: string;
  weightText: string;
  rir?: SetRir | null;
  failureStatus?: SetFailureStatus | null;
};

export type SetEffortCategory = "very_easy" | "good" | "hard" | "max" | "stopped_early";

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
    }).text,
    ...(input.set.rir ? { rir: input.set.rir } : {}),
    ...(input.set.failureStatus ? { failureStatus: input.set.failureStatus } : {})
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

  const hasRirField = "rir" in draft;
  const hasFailureStatusField = "failureStatus" in draft;
  const normalizedFailureStatus = hasFailureStatusField ? (draft.failureStatus ?? null) : undefined;
  const normalizedRir = (() => {
    if (!hasRirField && !hasFailureStatusField) {
      return undefined;
    }

    if (normalizedFailureStatus === "muscular_failure" || normalizedFailureStatus === "technical_failure") {
      return "rir_0" as const;
    }

    if (normalizedFailureStatus === "stopped_early") {
      return null;
    }

    return hasRirField ? (draft.rir ?? null) : undefined;
  })();

  return {
    actualReps: validation.actualReps,
    actualWeight: validation.actualWeight,
    ...(hasRirField || hasFailureStatusField ? { rir: normalizedRir ?? null } : {}),
    ...(hasFailureStatusField ? { failureStatus: normalizedFailureStatus ?? null } : {})
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

export function getSetEffortCategory(input: {
  rir?: SetRir | null | undefined;
  failureStatus?: SetFailureStatus | null | undefined;
}): SetEffortCategory | null {
  if (input.failureStatus === "stopped_early") {
    return "stopped_early";
  }

  if (input.failureStatus === "technical_failure" || input.failureStatus === "muscular_failure") {
    return "max";
  }

  switch (input.rir ?? null) {
    case "rir_5_plus":
    case "rir_4":
      return "very_easy";
    case "rir_3":
    case "rir_2":
      return "good";
    case "rir_1":
      return "hard";
    case "rir_0":
      return "max";
    default:
      return null;
  }
}

export function applySetEffortCategory(draft: SetLogDraft, category: SetEffortCategory | null): SetLogDraft {
  if (category === null) {
    return {
      ...draft,
      rir: null,
      failureStatus: null
    };
  }

  if (category === "stopped_early") {
    return {
      ...draft,
      failureStatus: "stopped_early",
      rir: null
    };
  }

  if (category === "very_easy") {
    return {
      ...draft,
      rir: "rir_5_plus",
      failureStatus: null
    };
  }

  if (category === "good") {
    return {
      ...draft,
      rir: "rir_2",
      failureStatus: null
    };
  }

  if (category === "hard") {
    return {
      ...draft,
      rir: "rir_1",
      failureStatus: null
    };
  }

  // "max"
  return {
    ...draft,
    rir: "rir_0",
    ...(draft.failureStatus === "stopped_early" ? { failureStatus: null } : {})
  };
}

export function formatSetEffortSummary(input: {
  rir?: SetRir | null | undefined;
  failureStatus?: SetFailureStatus | null | undefined;
}): string | null {
  const failureStatus = input.failureStatus ?? null;
  const rir = input.rir ?? null;

  if (failureStatus === "stopped_early") {
    return "Stopped early";
  }

  if (failureStatus === "technical_failure") {
    return "Max (technique)";
  }

  if (failureStatus === "muscular_failure") {
    return "Max (failure)";
  }

  switch (rir) {
    case "rir_0":
      return "Max";
    case "rir_1":
      return "Hard (1 left)";
    case "rir_2":
      return "Good (2 left)";
    case "rir_3":
      return "Good (3 left)";
    case "rir_4":
      return "Very easy (4 left)";
    case "rir_5_plus":
      return "Very easy (4+ left)";
    default:
      return null;
  }
}
