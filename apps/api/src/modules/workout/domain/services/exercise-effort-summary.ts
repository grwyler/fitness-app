import type { EffortFeedback, SetFailureStatus, SetRir } from "@fitness/shared";

export type LikelyEffortCategory =
  | "very_easy"
  | "easy"
  | "appropriate"
  | "hard"
  | "failure_or_too_hard"
  | "incomplete_or_stopped_early"
  | "unknown";

export type EffortConflictReason =
  | "SET_LEVEL_TOO_EASY_EXERCISE_LEVEL_TOO_HARD"
  | "SET_LEVEL_TOO_HARD_EXERCISE_LEVEL_TOO_EASY";

export type ExerciseEffortSummary = {
  hasSetLevelEffort: boolean;
  lowestRir: SetRir | null;
  highestRir: SetRir | null;
  anyMuscularFailure: boolean;
  anyTechnicalFailure: boolean;
  anyStoppedEarly: boolean;
  likelyEffortCategory: LikelyEffortCategory;
  conflictWithExerciseFeedback: boolean;
  conflictReason: EffortConflictReason | null;
};

const setRirOrder: Record<SetRir, number> = {
  rir_0: 0,
  rir_1: 1,
  rir_2: 2,
  rir_3: 3,
  rir_4: 4,
  rir_5_plus: 5
};

function minRir(values: SetRir[]) {
  return values.reduce((min, next) => (setRirOrder[next] < setRirOrder[min] ? next : min));
}

function maxRir(values: SetRir[]) {
  return values.reduce((max, next) => (setRirOrder[next] > setRirOrder[max] ? next : max));
}

function deriveLikelyEffortCategoryFromSets(sets: Array<{ rir?: SetRir | null; failureStatus?: SetFailureStatus | null }>): {
  lowestRir: SetRir | null;
  highestRir: SetRir | null;
  anyMuscularFailure: boolean;
  anyTechnicalFailure: boolean;
  anyStoppedEarly: boolean;
  likelyEffortCategory: LikelyEffortCategory;
} {
  const rirValues = sets.map((set) => set.rir ?? null).filter((rir): rir is SetRir => rir != null);
  const lowestRir = rirValues.length > 0 ? minRir(rirValues) : null;
  const highestRir = rirValues.length > 0 ? maxRir(rirValues) : null;

  const anyMuscularFailure = sets.some((set) => (set.failureStatus ?? null) === "muscular_failure");
  const anyTechnicalFailure = sets.some((set) => (set.failureStatus ?? null) === "technical_failure");
  const anyStoppedEarly = sets.some((set) => (set.failureStatus ?? null) === "stopped_early");

  const hasAnyRir = rirValues.length > 0;
  const hasAnyEffort = hasAnyRir || anyMuscularFailure || anyTechnicalFailure || anyStoppedEarly;
  if (!hasAnyEffort) {
    return {
      lowestRir,
      highestRir,
      anyMuscularFailure,
      anyTechnicalFailure,
      anyStoppedEarly,
      likelyEffortCategory: "unknown"
    };
  }

  // Conservative precedence: failure/near-failure and incomplete signals override high-RIR signals.
  if (anyMuscularFailure || anyTechnicalFailure || lowestRir === "rir_0") {
    return {
      lowestRir,
      highestRir,
      anyMuscularFailure,
      anyTechnicalFailure,
      anyStoppedEarly,
      likelyEffortCategory: "failure_or_too_hard"
    };
  }

  if (anyStoppedEarly) {
    return {
      lowestRir,
      highestRir,
      anyMuscularFailure,
      anyTechnicalFailure,
      anyStoppedEarly,
      likelyEffortCategory: "incomplete_or_stopped_early"
    };
  }

  if (lowestRir === "rir_5_plus") {
    return {
      lowestRir,
      highestRir,
      anyMuscularFailure,
      anyTechnicalFailure,
      anyStoppedEarly,
      likelyEffortCategory: "very_easy"
    };
  }

  if (lowestRir === "rir_4" || lowestRir === "rir_3") {
    return {
      lowestRir,
      highestRir,
      anyMuscularFailure,
      anyTechnicalFailure,
      anyStoppedEarly,
      likelyEffortCategory: "easy"
    };
  }

  if (lowestRir === "rir_2" || lowestRir === "rir_1") {
    return {
      lowestRir,
      highestRir,
      anyMuscularFailure,
      anyTechnicalFailure,
      anyStoppedEarly,
      likelyEffortCategory: "appropriate"
    };
  }

  return {
    lowestRir,
    highestRir,
    anyMuscularFailure,
    anyTechnicalFailure,
    anyStoppedEarly,
    likelyEffortCategory: "hard"
  };
}

export function summarizeExerciseEffortFromSets(input: {
  sets: Array<{ rir?: SetRir | null; failureStatus?: SetFailureStatus | null }> | null | undefined;
  exerciseFeedback: EffortFeedback | null | undefined;
}): ExerciseEffortSummary {
  const sets = input.sets ?? [];
  const exerciseFeedback = input.exerciseFeedback ?? null;
  const hasSetLevelEffort = sets.some((set) => (set.rir ?? null) != null || (set.failureStatus ?? null) != null);

  const derived = deriveLikelyEffortCategoryFromSets(sets);

  const setLevelEffortFeedback: EffortFeedback | null = (() => {
    if (!hasSetLevelEffort) {
      return null;
    }
    if (derived.likelyEffortCategory === "failure_or_too_hard") {
      return "too_hard";
    }
    if (derived.likelyEffortCategory === "very_easy") {
      return "too_easy";
    }
    // For everything else, treat set-level as broadly "ok" unless exercise-level is the only signal.
    return "just_right";
  })();

  const conflictReason: EffortConflictReason | null = (() => {
    if (!hasSetLevelEffort || !exerciseFeedback || !setLevelEffortFeedback) {
      return null;
    }

    if (setLevelEffortFeedback === "too_easy" && exerciseFeedback === "too_hard") {
      return "SET_LEVEL_TOO_EASY_EXERCISE_LEVEL_TOO_HARD";
    }

    if (setLevelEffortFeedback === "too_hard" && exerciseFeedback === "too_easy") {
      return "SET_LEVEL_TOO_HARD_EXERCISE_LEVEL_TOO_EASY";
    }

    return null;
  })();

  return {
    hasSetLevelEffort,
    lowestRir: derived.lowestRir,
    highestRir: derived.highestRir,
    anyMuscularFailure: derived.anyMuscularFailure,
    anyTechnicalFailure: derived.anyTechnicalFailure,
    anyStoppedEarly: derived.anyStoppedEarly,
    likelyEffortCategory: hasSetLevelEffort ? derived.likelyEffortCategory : "unknown",
    conflictWithExerciseFeedback: conflictReason != null,
    conflictReason
  };
}

export function resolveEffortFeedbackForProgression(input: {
  sets: Array<{
    targetReps?: number;
    actualReps?: number | null;
    targetWeightLbs?: number;
    actualWeightLbs?: number | null;
    rir?: SetRir | null;
    failureStatus?: SetFailureStatus | null;
  }> | null | undefined;
  exerciseFeedback: EffortFeedback;
  incrementLbs?: number | null;
}): { effectiveEffortFeedback: EffortFeedback; usedSetLevelEffort: boolean; conflictReason: EffortConflictReason | null } {
  const sets = input.sets ?? [];
  const hasSetLevelEffort = sets.some((set) => (set.rir ?? null) != null || (set.failureStatus ?? null) != null);

  if (!hasSetLevelEffort) {
    return { effectiveEffortFeedback: input.exerciseFeedback, usedSetLevelEffort: false, conflictReason: null };
  }

  const anyTechnicalFailure = sets.some((set) => (set.failureStatus ?? null) === "technical_failure");
  const anyMuscularFailure = sets.some((set) => (set.failureStatus ?? null) === "muscular_failure");
  const anyStoppedEarly = sets.some((set) => (set.failureStatus ?? null) === "stopped_early");
  const hasRir5Plus = sets.some((set) => (set.rir ?? null) === "rir_5_plus");
  const hasRir0 = sets.some((set) => (set.rir ?? null) === "rir_0");
  const hasNearFailure = anyTechnicalFailure || anyMuscularFailure || hasRir0;

  const incrementLbs = input.incrementLbs ?? null;
  const isWeightCloseToTarget = (args: { actualWeightLbs: number; targetWeightLbs: number }) => {
    if (!incrementLbs || incrementLbs <= 0) {
      return false;
    }

    if (args.targetWeightLbs <= 0) {
      return false;
    }

    const absoluteTolerance = Math.max(0, incrementLbs / 2);
    const relativeTolerance = Math.max(0, args.targetWeightLbs * 0.02);
    const tolerance = Math.max(absoluteTolerance, relativeTolerance);
    return Math.abs(args.actualWeightLbs - args.targetWeightLbs) <= tolerance;
  };

  const isRirSupportedRepOverperformanceSet = (set: (typeof sets)[number]) => {
    if ((set.rir ?? null) !== "rir_5_plus") {
      return false;
    }

    const actualReps = set.actualReps ?? null;
    const actualWeightLbs = set.actualWeightLbs ?? null;
    const targetReps = set.targetReps ?? null;
    const targetWeightLbs = set.targetWeightLbs ?? null;

    if (actualReps === null || actualWeightLbs === null || targetReps === null || targetWeightLbs === null) {
      return false;
    }

    if (actualReps <= 0 || targetReps <= 0) {
      return false;
    }

    if (!isWeightCloseToTarget({ actualWeightLbs, targetWeightLbs })) {
      return false;
    }

    const threshold = Math.max(targetReps + 3, Math.ceil(targetReps * 1.5));
    return actualReps >= threshold;
  };

  const setSignalsTooHard = anyTechnicalFailure || anyMuscularFailure;
  const setSignalsTooEasyStrong = hasRir5Plus && !hasNearFailure && !anyStoppedEarly && sets.some(isRirSupportedRepOverperformanceSet);
  const setSignalsTooEasyWeak = hasRir5Plus && !hasNearFailure && !anyStoppedEarly;

  const conflictReason: EffortConflictReason | null = (() => {
    if (setSignalsTooEasyWeak && input.exerciseFeedback === "too_hard") {
      return "SET_LEVEL_TOO_EASY_EXERCISE_LEVEL_TOO_HARD";
    }

    if (setSignalsTooHard && input.exerciseFeedback === "too_easy") {
      return "SET_LEVEL_TOO_HARD_EXERCISE_LEVEL_TOO_EASY";
    }

    return null;
  })();

  if (conflictReason) {
    return { effectiveEffortFeedback: "too_hard", usedSetLevelEffort: true, conflictReason };
  }

  if (setSignalsTooHard) {
    return { effectiveEffortFeedback: "too_hard", usedSetLevelEffort: true, conflictReason: null };
  }

  if (setSignalsTooEasyStrong) {
    return { effectiveEffortFeedback: "too_easy", usedSetLevelEffort: true, conflictReason: null };
  }

  // When both signals align on "too_easy", treat set-level RIR as supporting evidence even if reps weren't extreme.
  if (setSignalsTooEasyWeak && input.exerciseFeedback === "too_easy") {
    return { effectiveEffortFeedback: "too_easy", usedSetLevelEffort: true, conflictReason: null };
  }

  // Otherwise, keep exercise-level feedback as the primary decision signal, while still recording set-level evidence.
  return { effectiveEffortFeedback: input.exerciseFeedback, usedSetLevelEffort: false, conflictReason: null };
}
