import {
  MATERIAL_OVERPERFORMANCE_MULTIPLIER,
  formatWeightForUser,
  parseWeightInputForUser,
  type ExerciseLoggingModality,
  type LogSetRequest,
  type SetFailureStatus,
  type SetRir,
  type SetDto,
  type UnitSystem,
  type WorkoutSetType,
  type WeightValueDto
} from "@fitness/shared";

export type SetLogDraft = {
  repsText: string;
  weightText: string;
  durationText: string;
  distanceText: string;
  roundsText: string;
  setType: WorkoutSetType;
  rir?: SetRir | null;
  failureStatus?: SetFailureStatus | null;
};

export type SetEffortCategory = "very_easy" | "good" | "hard" | "max" | "stopped_early";

export type SetLogValidation = {
  actualReps: number | null;
  actualWeight: WeightValueDto | null;
  durationSeconds: number | null;
  distanceMeters: number | null;
  rounds: number | null;
  setType: WorkoutSetType;
  error: string | null;
};

function parseDurationTextToSeconds(value: string): number | null {
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

function formatDurationSeconds(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safe / 60);
  const remaining = safe % 60;
  return `${minutes}:${remaining.toString().padStart(2, "0")}`;
}

function metersToDistanceValueForUser(distanceMeters: number, unitSystem: UnitSystem): number {
  if (!Number.isFinite(distanceMeters)) {
    return 0;
  }

  return unitSystem === "metric" ? distanceMeters / 1000 : distanceMeters / 1609.344;
}

function distanceValueToMetersForUser(distanceValue: number, unitSystem: UnitSystem): number {
  return unitSystem === "metric" ? distanceValue * 1000 : distanceValue * 1609.344;
}

function formatDistanceValue(value: number) {
  if (!Number.isFinite(value)) {
    return "";
  }

  if (Math.abs(value) >= 100) {
    return value.toFixed(1).replace(/0+$/, "").replace(/\.$/, "");
  }

  return value.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
}

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
  modality?: ExerciseLoggingModality;
}): SetLogDraft {
  const previousSet = input.previousSet;
  const modality = input.modality ?? "reps_load";
  const sourceReps =
    previousSet?.actualReps !== null && previousSet?.actualReps !== undefined
      ? previousSet.actualReps
      : input.set.actualReps ?? input.set.targetReps ?? 0;
  const sourceWeight =
    previousSet?.actualWeight?.value ?? input.set.actualWeight?.value ?? input.set.targetWeight?.value ?? 0;
  const sourceDurationSeconds =
    previousSet?.actualDurationSeconds ?? input.set.actualDurationSeconds ?? input.set.targetDurationSeconds ?? null;
  const sourceDistanceMeters =
    previousSet?.actualDistanceMeters ?? input.set.actualDistanceMeters ?? input.set.targetDistanceMeters ?? null;
  const sourceRounds =
    previousSet?.actualRounds ?? input.set.actualRounds ?? input.set.targetRounds ?? null;
  const unitSystem = input.unitSystem ?? "imperial";
  const isRepsModality = modality === "reps_load" || modality === "reps_only";
  const supportsDuration =
    modality === "time" ||
    modality === "hold" ||
    modality === "time_distance" ||
    modality === "interval" ||
    modality === "distance";
  const supportsDistance = modality === "time_distance" || modality === "distance";
  const supportsRounds = modality === "interval";

  return {
    repsText: isRepsModality ? sourceReps.toString() : "",
    weightText: isRepsModality
      ? formatWeightForUser({
          weightLbs: sourceWeight,
          unitSystem,
          includeUnit: false,
          maximumFractionDigits: unitSystem === "metric" ? 1 : 2
        }).text
      : "",
    durationText: supportsDuration && sourceDurationSeconds !== null ? formatDurationSeconds(sourceDurationSeconds) : "",
    distanceText:
      supportsDistance && sourceDistanceMeters !== null
        ? formatDistanceValue(metersToDistanceValueForUser(sourceDistanceMeters, unitSystem))
        : "",
    roundsText: supportsRounds && sourceRounds !== null ? sourceRounds.toString() : "",
    setType: input.set.setType ?? "working",
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

export function validateSetLogDraft(
  draft: SetLogDraft,
  input: { unitSystem?: UnitSystem; modality: ExerciseLoggingModality }
): SetLogValidation {
  const unitSystem = input.unitSystem ?? "imperial";
  const modality = input.modality;

  const trimmedReps = draft.repsText.trim();
  const trimmedWeight = draft.weightText.trim();
  const trimmedDuration = draft.durationText.trim();
  const trimmedDistance = draft.distanceText.trim();
  const trimmedRounds = draft.roundsText.trim();

  const actualReps = trimmedReps.length === 0 ? null : Number(trimmedReps);
  const weightValueLbs =
    trimmedWeight.length === 0 ? null : parseWeightInputForUser({ weightText: trimmedWeight, unitSystem });
  const durationSeconds = parseDurationTextToSeconds(trimmedDuration);
  const distanceValue = trimmedDistance.length === 0 ? null : Number(trimmedDistance);
  const distanceMeters =
    distanceValue === null || !Number.isFinite(distanceValue) || distanceValue < 0
      ? null
      : distanceValueToMetersForUser(distanceValue, unitSystem);
  const roundsRaw = trimmedRounds.length === 0 ? null : Number(trimmedRounds);
  const rounds =
    roundsRaw === null || !Number.isFinite(roundsRaw) ? null : Math.floor(roundsRaw);
  const setType = draft.setType ?? "working";

  const base: Omit<SetLogValidation, "error"> = {
    actualReps: actualReps !== null && Number.isFinite(actualReps) ? actualReps : null,
    actualWeight: weightValueLbs === null ? null : { value: weightValueLbs, unit: "lb" },
    durationSeconds,
    distanceMeters,
    rounds,
    setType
  };

  if (modality === "reps_load") {
    if (base.actualReps === null || !Number.isInteger(base.actualReps) || base.actualReps < 0) {
      return { ...base, actualReps: null, actualWeight: null, error: "Enter reps as a whole number." };
    }

    if (weightValueLbs === null || !Number.isFinite(weightValueLbs) || weightValueLbs < 0) {
      return { ...base, actualReps: base.actualReps, actualWeight: null, error: "Enter a valid load." };
    }

    return { ...base, actualWeight: { value: weightValueLbs, unit: "lb" }, error: null };
  }

  if (modality === "reps_only") {
    if (base.actualReps === null || !Number.isInteger(base.actualReps) || base.actualReps < 0) {
      return { ...base, actualReps: null, error: "Enter reps as a whole number." };
    }

    if (weightValueLbs !== null && (!Number.isFinite(weightValueLbs) || weightValueLbs < 0)) {
      return { ...base, actualWeight: null, error: "Enter a valid load." };
    }

    return { ...base, error: null };
  }

  if (modality === "time" || modality === "hold") {
    if (durationSeconds === null) {
      return { ...base, error: "Enter a duration (mm:ss)." };
    }

    return { ...base, error: null };
  }

  if (modality === "time_distance") {
    if (durationSeconds === null && distanceMeters === null) {
      return { ...base, error: "Enter a duration and/or distance." };
    }

    return { ...base, error: null };
  }

  if (modality === "distance") {
    if (distanceMeters === null) {
      return { ...base, error: "Enter a distance." };
    }

    return { ...base, error: null };
  }

  // interval
  if (durationSeconds === null && (rounds === null || !Number.isInteger(rounds) || rounds <= 0)) {
    return { ...base, error: "Enter rounds and/or duration." };
  }

  return { ...base, error: null };
}

export function buildLogSetRequestFromDraft(
  draft: SetLogDraft,
  input: { unitSystem?: UnitSystem; modality: ExerciseLoggingModality }
): LogSetRequest | null {
  const modality = input.modality;
  const validation = validateSetLogDraft(draft, input);
  if (validation.error) {
    return null;
  }

  const setType = validation.setType;

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

  if (modality === "reps_load") {
    return {
      actualReps: validation.actualReps!,
      actualWeight: validation.actualWeight!,
      setType,
      ...(hasRirField || hasFailureStatusField ? { rir: normalizedRir ?? null } : {}),
      ...(hasFailureStatusField ? { failureStatus: normalizedFailureStatus ?? null } : {})
    };
  }

  if (modality === "reps_only") {
    return {
      actualReps: validation.actualReps!,
      ...(validation.actualWeight ? { actualWeight: validation.actualWeight } : {}),
      setType,
      ...(hasRirField || hasFailureStatusField ? { rir: normalizedRir ?? null } : {}),
      ...(hasFailureStatusField ? { failureStatus: normalizedFailureStatus ?? null } : {})
    };
  }

  if (modality === "time" || modality === "hold") {
    return {
      durationSeconds: validation.durationSeconds!,
      setType,
      ...(hasRirField || hasFailureStatusField ? { rir: normalizedRir ?? null } : {}),
      ...(hasFailureStatusField ? { failureStatus: normalizedFailureStatus ?? null } : {})
    };
  }

  if (modality === "time_distance") {
    return {
      ...(validation.durationSeconds !== null ? { durationSeconds: validation.durationSeconds } : {}),
      ...(validation.distanceMeters !== null ? { distanceMeters: validation.distanceMeters } : {}),
      setType,
      ...(hasRirField || hasFailureStatusField ? { rir: normalizedRir ?? null } : {}),
      ...(hasFailureStatusField ? { failureStatus: normalizedFailureStatus ?? null } : {})
    };
  }

  if (modality === "distance") {
    return {
      distanceMeters: validation.distanceMeters!,
      ...(validation.durationSeconds !== null ? { durationSeconds: validation.durationSeconds } : {}),
      setType,
      ...(hasRirField || hasFailureStatusField ? { rir: normalizedRir ?? null } : {}),
      ...(hasFailureStatusField ? { failureStatus: normalizedFailureStatus ?? null } : {})
    };
  }

  // interval
  return {
    ...(validation.rounds !== null ? { rounds: validation.rounds } : {}),
    ...(validation.durationSeconds !== null ? { durationSeconds: validation.durationSeconds } : {}),
    setType,
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
