import {
  MATERIAL_OVERPERFORMANCE_MULTIPLIER,
  type ExerciseCategory,
  type ExperienceLevel,
  type ProgressionAggressiveness,
  type ProgressionStrategy,
  type RecoveryState,
  type TrainingGoal
} from "@fitness/shared";
import type {
  ProgressionComputationInput,
  ProgressionComputationResult,
  ProgressionComputationInputV2,
  ProgressionComputationResultV2,
  ProgressionStateSnapshot,
  ProgressionStateSnapshotV2,
  ExerciseLoadType,
  ExerciseWorkoutOutcome,
  ExerciseWorkoutSetOutcome
} from "../models/progression.js";
import type { GeneratedSetTarget, PrescriptionGenerationInput } from "../models/progression.js";
import { resolveEffortFeedbackForProgression } from "./exercise-effort-summary.js";

const MIN_RECALIBRATION_SET_COUNT = 2;
const MAX_RECALIBRATION_JUMP_MULTIPLIER = 1.75;
const RECENT_TRAINING_REPEAT_THRESHOLD_DAYS = 14;
const RECENT_TRAINING_REDUCTION_THRESHOLD_DAYS = 30;
const DEFAULT_TRAINING_GOAL: TrainingGoal = "general_fitness";
const MATERIAL_REP_OVERPERFORMANCE_MIN_REPS_DELTA = 5;
const MATERIAL_REP_OVERPERFORMANCE_MULTIPLIER = 2;
const EXTREME_REP_OVERPERFORMANCE_MIN_REPS_DELTA = 20;
const EXTREME_REP_OVERPERFORMANCE_MULTIPLIER = 5;
const TARGET_WEIGHT_TOLERANCE_RELATIVE = 0.02;

function roundToTwoDecimals(value: number) {
  return Math.round(value * 100) / 100;
}

function roundDownToIncrement(weightLbs: number, incrementLbs: number) {
  if (incrementLbs <= 0) {
    throw new Error("incrementLbs must be greater than 0.");
  }

  const rounded = Math.floor(weightLbs / incrementLbs) * incrementLbs;
  return roundToTwoDecimals(Math.max(0, rounded));
}

function roundUpToIncrement(weightLbs: number, incrementLbs: number) {
  if (incrementLbs <= 0) {
    throw new Error("incrementLbs must be greater than 0.");
  }

  const rounded = Math.ceil(weightLbs / incrementLbs) * incrementLbs;
  return roundToTwoDecimals(Math.max(0, rounded));
}

function resolveLoadType(loadType: ExerciseLoadType | undefined): ExerciseLoadType {
  return loadType ?? "external";
}

function loadNoun(loadType: ExerciseLoadType) {
  return loadType === "assistance" ? "assistance" : "weight";
}

function applyHarderLoad(input: {
  loadType: ExerciseLoadType;
  previousWeightLbs: number;
  deltaLbs: number;
  incrementLbs: number;
}) {
  const raw =
    input.loadType === "assistance"
      ? Math.max(0, input.previousWeightLbs - input.deltaLbs)
      : input.previousWeightLbs + input.deltaLbs;

  // In assistance-mode, rounding "up" avoids accidentally making the movement harder than intended.
  return input.loadType === "assistance"
    ? roundUpToIncrement(raw, input.incrementLbs)
    : roundDownToIncrement(raw, input.incrementLbs);
}

function applyEasierLoad(input: {
  loadType: ExerciseLoadType;
  previousWeightLbs: number;
  deltaLbs: number;
  incrementLbs: number;
}) {
  const raw =
    input.loadType === "assistance"
      ? input.previousWeightLbs + input.deltaLbs
      : Math.max(0, input.previousWeightLbs - input.deltaLbs);

  // Rounding "up" in assistance-mode keeps assistance at least as high as computed (never harder than intended).
  return input.loadType === "assistance"
    ? roundUpToIncrement(raw, input.incrementLbs)
    : roundDownToIncrement(raw, input.incrementLbs);
}

function clampInteger(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function getSuccessIncreaseStepCount(category: ExerciseCategory, effortFeedback: ExerciseWorkoutOutcome["effortFeedback"]) {
  if (effortFeedback === "too_easy") {
    return category === "compound" ? 2 : 2;
  }

  return 1;
}

function shouldTreatRirAsTooEasy(outcome: ExerciseWorkoutOutcome, incrementLbs: number) {
  const effortSignals = getSetEffortSignals(outcome.sets);
  if (!effortSignals.hasRir5Plus) {
    return false;
  }

  if (effortSignals.hasNearFailure || effortSignals.hasTechnicalFailure || effortSignals.hasStoppedEarly) {
    return false;
  }

  const sets = outcome.sets ?? [];
  return sets.some((set) => isRirSupportedRepOverperformanceSet(set, incrementLbs));
}

function getAggressiveSuccessStepCount(input: {
  category: ExerciseCategory;
  effortFeedback: ExerciseWorkoutOutcome["effortFeedback"];
  experienceLevel: ExperienceLevel | null;
  recoveryState: RecoveryState | null;
}) {
  const base = getSuccessIncreaseStepCount(input.category, input.effortFeedback);
  if (input.effortFeedback !== "too_easy") {
    return base;
  }

  if (input.recoveryState === "fatigued" || input.recoveryState === "exhausted") {
    return 1;
  }

  if (input.recoveryState === "fresh" && input.experienceLevel === "intermediate") {
    return base;
  }

  if (input.experienceLevel === "intermediate" || input.experienceLevel === "advanced") {
    return 1;
  }

  return base;
}

function getRepIncreaseStepCount(input: {
  aggressiveness: ProgressionAggressiveness;
  category: ExerciseCategory;
  effortFeedback: ExerciseWorkoutOutcome["effortFeedback"];
  experienceLevel: ExperienceLevel | null;
  recoveryState: RecoveryState | null;
}) {
  if (input.aggressiveness === "conservative") {
    return 1;
  }

  const policyAdjusted = getAggressiveSuccessStepCount({
    category: input.category,
    effortFeedback: input.effortFeedback,
    experienceLevel: input.experienceLevel,
    recoveryState: input.recoveryState
  });

  if (input.aggressiveness === "balanced") {
    return policyAdjusted;
  }

  return Math.max(1, policyAdjusted + 1);
}

function resolveTrainingGoal(trainingGoal: TrainingGoal | null | undefined): TrainingGoal | null {
  return trainingGoal ?? null;
}

function withPolicySuffix(reason: string, policy: { trainingGoal: TrainingGoal | null; experienceLevel: ExperienceLevel | null; recoveryState?: RecoveryState | null }) {
  const tags: string[] = [];
  if (policy.trainingGoal) {
    tags.push(`goal=${policy.trainingGoal}`);
  }
  if (policy.experienceLevel === "intermediate" || policy.experienceLevel === "advanced") {
    tags.push(`experience=${policy.experienceLevel}`);
  }
  if (policy.recoveryState && policy.recoveryState !== "normal") {
    tags.push(`recovery=${policy.recoveryState}`);
  }

  if (tags.length === 0) {
    return reason;
  }

  return `${reason} (Policy: ${tags.join(", ")})`;
}

function daysSince(input: { previous: Date; current: Date }) {
  const ms = input.current.getTime() - input.previous.getTime();
  return Math.floor(ms / 86_400_000);
}

function median(values: number[]) {
  const sorted = [...values].sort((left, right) => left - right);
  const middleIndex = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 1) {
    return sorted[middleIndex]!;
  }

  return (sorted[middleIndex - 1]! + sorted[middleIndex]!) / 2;
}

function estimateOneRepMaxEpley(weightLbs: number, reps: number) {
  return weightLbs * (1 + reps / 30);
}

function estimateWorkingWeightFromOneRepMax(e1rm: number, targetReps: number) {
  return e1rm / (1 + targetReps / 30);
}

export function isMaterialOverperformanceSet(set: ExerciseWorkoutSetOutcome, loadType?: ExerciseLoadType) {
  if (set.actualReps === null || set.actualWeightLbs === null) {
    return false;
  }

  const resolvedLoadType = resolveLoadType(loadType);

  return (
    set.actualReps > 0 &&
    set.targetWeightLbs > 0 &&
    (resolvedLoadType === "assistance"
      ? set.actualWeightLbs <= set.targetWeightLbs / MATERIAL_OVERPERFORMANCE_MULTIPLIER
      : set.actualWeightLbs >= set.targetWeightLbs * MATERIAL_OVERPERFORMANCE_MULTIPLIER)
  );
}

function materialRepOverperformanceThreshold(targetReps: number) {
  return Math.max(
    targetReps + MATERIAL_REP_OVERPERFORMANCE_MIN_REPS_DELTA,
    Math.ceil(targetReps * MATERIAL_REP_OVERPERFORMANCE_MULTIPLIER)
  );
}

function extremeRepOverperformanceThreshold(targetReps: number) {
  return Math.max(
    targetReps + EXTREME_REP_OVERPERFORMANCE_MIN_REPS_DELTA,
    Math.ceil(targetReps * EXTREME_REP_OVERPERFORMANCE_MULTIPLIER)
  );
}

function isWeightCloseToTarget(input: { actualWeightLbs: number; targetWeightLbs: number; incrementLbs: number }) {
  if (input.targetWeightLbs <= 0) {
    return false;
  }

  const absoluteTolerance = Math.max(0, input.incrementLbs / 2);
  const relativeTolerance = Math.max(0, input.targetWeightLbs * TARGET_WEIGHT_TOLERANCE_RELATIVE);
  const tolerance = Math.max(absoluteTolerance, relativeTolerance);
  return Math.abs(input.actualWeightLbs - input.targetWeightLbs) <= tolerance;
}

export function isMaterialRepOverperformanceSet(set: ExerciseWorkoutSetOutcome, incrementLbs: number) {
  if (set.actualReps === null || set.actualWeightLbs === null) {
    return false;
  }

  if (set.actualReps <= 0 || set.targetReps <= 0) {
    return false;
  }

  if (!isWeightCloseToTarget({ actualWeightLbs: set.actualWeightLbs, targetWeightLbs: set.targetWeightLbs, incrementLbs })) {
    return false;
  }

  return set.actualReps >= materialRepOverperformanceThreshold(set.targetReps);
}

function isRirSupportedRepOverperformanceSet(set: ExerciseWorkoutSetOutcome, incrementLbs: number) {
  if (set.rir !== "rir_5_plus") {
    return false;
  }

  if (set.actualReps === null || set.actualWeightLbs === null) {
    return false;
  }

  if (set.actualReps <= 0 || set.targetReps <= 0) {
    return false;
  }

  if (!isWeightCloseToTarget({ actualWeightLbs: set.actualWeightLbs, targetWeightLbs: set.targetWeightLbs, incrementLbs })) {
    return false;
  }

  const threshold = Math.max(set.targetReps + 3, Math.ceil(set.targetReps * 1.5));
  return set.actualReps >= threshold;
}

function isExtremeRepOverperformanceSet(set: ExerciseWorkoutSetOutcome) {
  if (set.actualReps === null) {
    return false;
  }

  return set.targetReps > 0 && set.actualReps >= extremeRepOverperformanceThreshold(set.targetReps);
}

function getSetEffortSignals(sets: ExerciseWorkoutSetOutcome[] | undefined) {
  const normalizedSets = sets ?? [];
  const hasStoppedEarly = normalizedSets.some((set) => set.failureStatus === "stopped_early");
  const hasTechnicalFailure = normalizedSets.some((set) => set.failureStatus === "technical_failure");
  const hasMuscularFailure = normalizedSets.some((set) => set.failureStatus === "muscular_failure");
  const hasRir0 = normalizedSets.some((set) => set.rir === "rir_0");
  const hasNearFailure = hasTechnicalFailure || hasMuscularFailure || hasRir0;
  const hasRir5Plus = normalizedSets.some((set) => set.rir === "rir_5_plus");

  return {
    hasStoppedEarly,
    hasTechnicalFailure,
    hasMuscularFailure,
    hasRir0,
    hasNearFailure,
    hasRir5Plus,
    hasAnyEffort: normalizedSets.some((set) => set.rir != null || set.failureStatus != null)
  };
}

function hasEffectiveFailure(outcome: ExerciseWorkoutOutcome, loadType: ExerciseLoadType) {
  if (!outcome.sets) {
    return outcome.hasFailure ?? false;
  }

  return outcome.sets.some(
    (set) =>
      set.failureStatus !== "stopped_early" &&
      set.actualReps !== null &&
      set.actualReps < set.targetReps &&
      !isMaterialOverperformanceSet(set, loadType)
  );
}

function hasExceptionalOverperformance(input: { outcome: ExerciseWorkoutOutcome; incrementLbs: number }) {
  const performanceSets = (input.outcome.sets ?? []).filter((set) => set.failureStatus !== "stopped_early");
  const weightQualifyingSets = performanceSets.filter((set) => isMaterialOverperformanceSet(set));
  if (weightQualifyingSets.length >= MIN_RECALIBRATION_SET_COUNT) {
    return true;
  }

  const repQualifyingSets = performanceSets.filter((set) => isMaterialRepOverperformanceSet(set, input.incrementLbs));
  if (repQualifyingSets.length >= MIN_RECALIBRATION_SET_COUNT) {
    return true;
  }

  return repQualifyingSets.some(isExtremeRepOverperformanceSet);
}

export class ProgressionEngine {
  private isManualTarget(reason: string | null | undefined): boolean {
    return reason?.startsWith("manual") === true;
  }
  /**
   * One deterministic prescription path for new and established users. Saved state
   * is the fast projection; when absent/incomplete it is seeded from comparable
   * completed history here, never by the workout-session factory.
   */
  public generatePrescription(input: PrescriptionGenerationInput): GeneratedSetTarget[] {
    const { state, exercise, setScheme, targetSets } = input;
    const explicit = input.explicitTargets ?? [];
    const workingHistory = input.history?.sets.filter((set) => set.setType !== "warmup") ?? [];
    const hasFailedSet = workingHistory.some((set) => set.status === "failed" || set.failureStatus != null);
    const eligible = workingHistory.filter((set) => set.status === "completed" && set.failureStatus == null && set.actualReps !== null);
    const allSuccessful = eligible.length > 0 && eligible.length === workingHistory.length && !hasFailedSet &&
      eligible.every((set) => (set.actualReps ?? 0) >= (set.targetReps ?? 0));
    const failedHistory = hasFailedSet;
    const firstActual = eligible[0];
    const lastSuccessful = eligible.at(-1) ?? null;
    const priorSuccessfulSets = input.history?.previousSuccessfulSets?.filter((set) => set.setType !== "warmup" && set.status === "completed" && set.failureStatus == null) ?? [];
    const priorSuccessfulLoad = [...priorSuccessfulSets].reverse().find((set) => (set.actualWeightLbs ?? set.targetWeightLbs) != null)?.actualWeightLbs ?? [...priorSuccessfulSets].reverse().find((set) => set.targetWeightLbs != null)?.targetWeightLbs ?? null;
    const actualLoad = lastSuccessful?.actualWeightLbs;
    const historicalLoad = actualLoad != null && actualLoad > 0
      ? actualLoad
      : lastSuccessful?.targetWeightLbs != null && lastSuccessful.targetWeightLbs > 0
        ? lastSuccessful.targetWeightLbs
        : priorSuccessfulLoad != null && priorSuccessfulLoad > 0 ? priorSuccessfulLoad : null;
    const historicalPlannedLoad = [...workingHistory].reverse().find((set) => set.targetWeightLbs != null && set.targetWeightLbs > 0)?.targetWeightLbs ?? null;
    const stateIsNewerThanHistory = state.lastPerformedAt !== null &&
      (input.history?.completedAt == null || state.lastPerformedAt.getTime() >= input.history.completedAt.getTime());
    const hasSavedProgress = stateIsNewerThanHistory;
    const plannedCandidate = explicit.find((target) => target.targetWeight?.value != null)?.targetWeight?.value ?? input.planTargetWeightLbs ?? null;
    const plannedLoad = plannedCandidate != null && plannedCandidate > 0 ? plannedCandidate : null;
    const validSavedLoad = state.currentWeightLbs > 0 || exercise.isBodyweight || exercise.isWeightOptional;
    const fallbackLoad = input.defaultStartingWeightLbs != null && input.defaultStartingWeightLbs > 0
      ? input.defaultStartingWeightLbs
      : exercise.isBodyweight || exercise.isWeightOptional ? 0 : null;
    // Source-of-truth precedence: a current plan-scoped saved state wins only
    // when it is at least as recent as comparable history. Otherwise use the
    // reusable plan target, then successful actual history, then historical
    // planned work, then a valid legacy state seed, and finally the exercise
    // default. Zero is a valid fallback only for no-external-load movements.
    const baselineLoad = hasSavedProgress && validSavedLoad
      ? state.currentWeightLbs
      : plannedLoad ?? historicalLoad ?? historicalPlannedLoad ?? (validSavedLoad ? state.currentWeightLbs : null) ?? fallbackLoad;
    const historicalRep = lastSuccessful?.targetReps ?? state.repGoal;
    const baselineRep = hasSavedProgress ? state.repGoal : historicalRep;

    // History is evidence for the same engine's next small step. Failures and
    // mixed outcomes hold; a successful sequence earns one rep (then one increment).
    let nextLoad: number | null = baselineLoad;
    let nextRep = Math.max(state.repRangeMin, Math.min(state.repRangeMax, baselineRep));
    if (!hasSavedProgress && allSuccessful) {
      const progressionSets = input.history?.sets.filter((set) => set.setType !== "warmup") ?? [];
      const completedReps = progressionSets.map((set) => set.actualReps ?? set.targetReps ?? nextRep);
      const priorTargets = progressionSets.map((set) => set.targetReps ?? nextRep);
      const reachedPriorTargets = completedReps.every((reps, index) => reps >= (priorTargets[index] ?? nextRep));
      const reachedRangeTop = nextRep >= state.repRangeMax;
      const successfulWork = progressionSets.every((set) => (set.actualReps ?? 0) >= (set.targetReps ?? 0));
      const completedAtTarget = completedReps.every((reps, index) => reps >= (priorTargets[index] ?? nextRep));
      if (reachedPriorTargets && input.loggingModality !== "reps_only" &&
          successfulWork && completedAtTarget && reachedRangeTop) {
        nextLoad = baselineLoad === null ? null : baselineLoad + exercise.incrementLbs;
        nextRep = state.repRangeMin;
      } else if (reachedPriorTargets) {
        nextRep = Math.min(state.repRangeMax, nextRep + 1);
      }
    } else if (!hasSavedProgress && failedHistory) {
      const usable = firstActual;
      if (usable) {
        nextLoad = usable.actualWeightLbs ?? usable.targetWeightLbs ?? nextLoad;
        nextRep = Math.max(state.repRangeMin, usable.targetReps ?? nextRep);
      }
      nextRep = Math.max(state.repRangeMin, nextRep);
    }
    if (hasSavedProgress && failedHistory) {
      const missed = workingHistory.some((set) => set.status === "failed" || (set.actualReps ?? set.targetReps ?? 0) < (set.targetReps ?? 0));
      if (missed) {
        nextLoad = baselineLoad;
        nextRep = Math.max(state.repRangeMin, Math.min(state.repRangeMax, state.repGoal));
      }
    }
    const loadIsValid = baselineLoad !== null && (baselineLoad > 0 || exercise.isBodyweight || exercise.isWeightOptional);
    if (!loadIsValid) nextLoad = plannedLoad ?? historicalLoad ?? historicalPlannedLoad ?? (validSavedLoad ? state.currentWeightLbs : null) ?? fallbackLoad;

    let progressionReason: string | null = null;
    const generated = Array.from({ length: targetSets }, (_, index): GeneratedSetTarget => {
      const target = explicit[index];
      let repTargetText = target?.repTargetText ?? null;
      let reps = repTargetText?.trim().toUpperCase() === "AMRAP"
        ? null
        : repTargetText && /^\d+$/.test(repTargetText.trim()) ? Number(repTargetText.trim()) : nextRep;
      let load = target?.targetWeight?.value ?? nextLoad;
      const prior = eligible[index] ?? null;
      if (prior && !target?.targetWeight && !hasSavedProgress) load = prior.actualWeightLbs ?? prior.targetWeightLbs ?? load;
      if (prior && !target?.repTargetText && !hasSavedProgress) reps = nextRep;
      if (setScheme === "ascending_pyramid" && !target?.targetWeight) {
        load = nextLoad === null ? null : nextLoad + exercise.incrementLbs * index;
        reps = reps === null ? null : Math.max(state.repRangeMin, nextRep - index);
      } else if (setScheme === "reverse_pyramid" && !target?.targetWeight) {
        load = nextLoad === null ? null : nextLoad + exercise.incrementLbs * (targetSets - index - 1);
        reps = reps === null ? null : nextRep + index;
      }
      if (setScheme === "amrap" && index === targetSets - 1 && !repTargetText) {
        reps = null;
        repTargetText = "AMRAP";
      }
      if (setScheme === "ascending_pyramid" || setScheme === "reverse_pyramid") {
        const perSetBaseline = eligible[index];
        if (perSetBaseline && allSuccessful && perSetBaseline.actualReps !== null && perSetBaseline.actualReps >= (perSetBaseline.targetReps ?? nextRep)) {
          progressionReason = "+1 rep from last session";
        }
      } else if (allSuccessful) {
        progressionReason = nextLoad !== null && baselineLoad !== null && nextLoad > baselineLoad ? "Load increased" : nextRep > baselineRep ? "+1 rep from last session" : null;
      }
      const historicalTierSet = input.history?.sets.find((set) => set.setNumber === index + 1);
      const historicalTiers = historicalTierSet?.tiers;
      const historicalSet = input.history?.sets.find((set) => set.setNumber === index + 1) ?? null;
      const tierSequenceSuccessful = !!historicalTiers?.length && historicalTiers.every((tier) => tier.status === "completed" && tier.actualReps != null && (tier.targetReps == null || tier.actualReps >= tier.targetReps));
      const tiers = setScheme === "drop_multi_tier"
        ? (target?.tiers?.length ? target.tiers : historicalTiers?.length ? historicalTiers : [
            { order: 1, targetWeight: load === null ? null : { value: load, unit: "lb" as const }, targetReps: reps ?? nextRep },
            { order: 2, targetWeight: load === null ? null : { value: Math.max(0, load - exercise.incrementLbs * 2), unit: "lb" as const }, targetReps: reps ?? nextRep }
          ]).map((tier, tierIndex) => {
            const priorTier = historicalTiers?.find((prior) => prior.order === tier.order) ?? historicalTiers?.[tierIndex];
            const priorSuccessful = tierSequenceSuccessful && priorTier?.status === "completed" && priorTier.actualReps !== null && priorTier.actualReps !== undefined;
            const repGoal = priorSuccessful
              ? Math.max(1, (priorTier.actualReps ?? tier.targetReps ?? nextRep) + 1)
              : tier.targetReps ?? nextRep;
            // A multi-tier sequence has its own rep bands per tier. Progress it
            // with one rep at a time; seed changed loads from actual performance,
            // and leave load escalation to a later progression decision.
            const nextTierLoad = priorSuccessful
              ? priorTier?.actualWeight?.value ?? priorTier?.targetWeight?.value ?? tier.targetWeight?.value ?? load
              : tier.targetWeight?.value ?? load;
            return {
              ...tier,
              targetWeight: nextTierLoad === null ? null : { value: nextTierLoad, unit: "lb" as const },
              targetReps: repGoal,
              originalTargetWeight: tier.originalTargetWeight ?? tier.targetWeight ?? null,
              originalTargetReps: tier.originalTargetReps ?? tier.targetReps ?? null,
              previousActualWeight: priorTier?.actualWeight ?? null,
              previousActualReps: priorTier?.actualReps ?? null,
              adaptationReason: priorSuccessful ? "+1 rep from last session" : null,
              actualWeight: null,
              actualReps: null,
              status: "pending" as const
            };
          })
        : null;
      return {
        setNumber: index + 1,
        targetReps: reps,
        targetWeightLbs: load,
        repTargetText,
        tiers,
        previousActualReps: historicalSet?.actualReps ?? null,
        previousActualWeightLbs: historicalSet?.actualWeightLbs ?? null,
        reason: progressionReason
      };
    });

    // Explicit per-set targets are authoritative. History only fills gaps and the
    // same progression decision is then materialized across the chosen structure.
    return generated;
  }

  /** Reassess only pending targets; deterministic updates share the engine boundary. */
  public adaptRemainingTargets(input: {
    targetReps: number | null;
    targetWeightLbs: number | null;
    actualReps: number | null;
    actualWeightLbs: number | null;
    status: "completed" | "failed";
    rir?: import("@fitness/shared").SetRir | null;
    repRangeMin: number;
    repRangeMax: number;
    tiers?: import("@fitness/shared").WorkoutSetTierDto[] | null;
    pending: Array<{ setId: string; targetReps: number | null; targetWeightLbs: number | null; tiers?: import("@fitness/shared").WorkoutSetTierDto[] | null; adaptationReason?: string | null }>;
  }): Array<{ setId: string; targetReps: number | null; targetWeightLbs: number | null; tiers?: import("@fitness/shared").WorkoutSetTierDto[]; reason: string }> {
    if (input.tiers?.length) {
      const skipped = input.tiers.some((tier) => tier.status === "skipped");
      const failed = input.tiers.some((tier) => tier.status === "failed" || (tier.status === "completed" && tier.targetReps != null && (tier.actualReps ?? 0) < tier.targetReps));
      const complete = input.tiers.every((tier) => tier.status === "completed" && (tier.targetReps == null || (tier.actualReps ?? 0) >= tier.targetReps));
      // A skipped tier means there is not enough evidence to adapt an extended
      // sequence. A failed performed tier earns only a one-rep ease on future
      // sequences; it never changes their loads.
      if (skipped || (!failed && !complete)) return [];
      const reason = failed ? "Held after difficult tier sequence" : input.tiers.some((tier) => tier.actualWeight?.value !== tier.targetWeight?.value) ? "Adjusted to performed tier loads" : "+1 rep after successful tier sequence";
      return input.pending.filter((set) => !this.isManualTarget(set.adaptationReason)).flatMap((set) => {
        if (!set.tiers?.length) return [];
        let changed = false;
        const tiers = set.tiers.map((tier) => {
          if (this.isManualTarget(tier.adaptationReason)) return tier;
          const priorTier = input.tiers?.find((item) => item.order === tier.order);
          if (!priorTier) return tier;
          if (failed) {
            if (tier.targetReps == null) return tier;
            const targetReps = Math.max(input.repRangeMin, tier.targetReps - 1);
            changed ||= targetReps !== tier.targetReps;
              return { ...tier, targetReps, ...(targetReps !== tier.targetReps ? { adaptationReason: reason } : {}) };
          }
          const performedWeight = priorTier.actualWeight?.value ?? null;
          const weightChanged = performedWeight !== null && performedWeight !== priorTier.targetWeight?.value;
          const comfortable = input.rir != null && ["rir_3", "rir_4", "rir_5_plus"].includes(input.rir) && priorTier.targetReps != null && (priorTier.actualReps ?? 0) >= priorTier.targetReps;
          const targetReps = comfortable && tier.targetReps != null ? tier.targetReps + 1 : tier.targetReps;
          const targetWeight = weightChanged ? { value: performedWeight!, unit: "lb" as const } : tier.targetWeight;
          changed ||= targetReps !== tier.targetReps || weightChanged;
          return {
            ...tier,
            ...(targetReps !== undefined ? { targetReps } : {}),
            ...(weightChanged ? { targetWeight } : {}),
            ...(targetReps !== tier.targetReps || weightChanged ? { adaptationReason: reason } : {})
          };
        });
        const setComfortable = !failed && input.rir != null && ["rir_3", "rir_4", "rir_5_plus"].includes(input.rir);
        const targetReps = setComfortable && set.targetReps !== null ? Math.min(input.repRangeMax, set.targetReps + 1) : set.targetReps;
        changed ||= targetReps !== set.targetReps;
        return changed ? [{ setId: set.setId, targetReps, targetWeightLbs: set.targetWeightLbs, tiers, reason }] : [];
      });
    }
    const missed = input.status === "failed" || (input.actualReps !== null && input.targetReps !== null && input.actualReps < input.targetReps);
    const comfortable = input.status === "completed" && input.actualReps !== null && input.targetReps !== null &&
      input.actualReps >= input.targetReps + 2 && ["rir_3", "rir_4", "rir_5_plus"].includes(input.rir ?? "");
    const changedLoad = input.actualWeightLbs !== null && input.targetWeightLbs !== null && input.actualWeightLbs !== input.targetWeightLbs;
    if (!missed && !comfortable && !changedLoad) return [];
    const reason = missed ? "Adjusted after missed target" : changedLoad ? "Adjusted to performed load" : "+1 rep after comfortable set";
    return input.pending.filter((set) => !this.isManualTarget(set.adaptationReason)).flatMap((set) => {
      const reps = set.targetReps === null ? null : missed
        ? Math.max(input.repRangeMin, set.targetReps - 1)
        : comfortable ? Math.min(input.repRangeMax, set.targetReps + 1) : set.targetReps;
      const weight = changedLoad ? input.actualWeightLbs : set.targetWeightLbs;
      return reps !== set.targetReps || weight !== set.targetWeightLbs
        ? [{ setId: set.setId, targetReps: reps, targetWeightLbs: weight, reason }]
        : [];
    });
  }

  public calculateWithStrategyV2(
    input: ProgressionComputationInputV2 & { strategy: ProgressionStrategy }
  ): ProgressionComputationResultV2 {
    const trainingGoal = resolveTrainingGoal(input.trainingGoal);
    switch (input.strategy) {
      case "double_progression": {
        return this.calculateDoubleProgression({ ...input, trainingGoal });
      }
      case "fixed_weight": {
        return this.calculateFixedWeight({ ...input, trainingGoal });
      }
      case "bodyweight_reps": {
        return this.calculateBodyweightReps({ ...input, trainingGoal });
      }
      case "bodyweight_weighted": {
        return this.calculateBodyweightWeighted({ ...input, trainingGoal });
      }
      case "no_progression": {
        const { state, outcome } = input;
        const previousWeightLbs = roundToTwoDecimals(state.currentWeightLbs);
        const previousRepGoal = state.repGoal;
        const repRangeMin = state.repRangeMin;
        const repRangeMax = state.repRangeMax;
        const nextLastPerformedAt = input.performedAt ? input.performedAt : (state.lastPerformedAt ?? null);

        const nextState: ProgressionStateSnapshotV2 = {
          currentWeightLbs: previousWeightLbs,
          lastCompletedWeightLbs: state.lastCompletedWeightLbs,
          consecutiveFailures: state.consecutiveFailures,
          lastEffortFeedback: outcome.effortFeedback,
          lastPerformedAt: nextLastPerformedAt,
          repGoal: previousRepGoal,
          repRangeMin,
          repRangeMax
        };

        return {
          previousWeightLbs,
          nextWeightLbs: previousWeightLbs,
          previousRepGoal,
          nextRepGoal: previousRepGoal,
          result: "skipped",
          reason: withPolicySuffix("Progression skipped because this exercise is marked no_progression.", {
            trainingGoal,
            experienceLevel: input.experienceLevel ?? null
          }),
          nextState
        };
      }
    }
  }

  public calculate(input: ProgressionComputationInput): ProgressionComputationResult {
    const { exercise, outcome: rawOutcome, state } = input;
    const trainingGoal = resolveTrainingGoal(input.trainingGoal);
    const recoveryState = input.recoveryState ?? null;
    const loadType = resolveLoadType(exercise.loadType);
    const previousWeightLbs = roundToTwoDecimals(state.currentWeightLbs);
    const lastPerformedAt = state.lastPerformedAt ?? null;
    const performedAt = input.performedAt ?? new Date(0);
    const nextLastPerformedAt = input.performedAt ? performedAt : lastPerformedAt;

    const { effectiveEffortFeedback } = resolveEffortFeedbackForProgression({
      sets: rawOutcome.sets,
      exerciseFeedback: rawOutcome.effortFeedback,
      incrementLbs: exercise.incrementLbs
    });

    const outcome: ExerciseWorkoutOutcome = {
      ...rawOutcome,
      sets: rawOutcome.sets!,
      effortFeedback: effectiveEffortFeedback
    };

    const effectiveInput: ProgressionComputationInput = {
      ...input,
      outcome
    };

    if (previousWeightLbs < 0) {
      throw new Error("currentWeightLbs must be greater than or equal to 0.");
    }

    if (exercise.incrementLbs <= 0) {
      throw new Error("incrementLbs must be greater than 0.");
    }

    if (exercise.isBodyweight && !exercise.isWeightOptional) {
      const nextState: ProgressionStateSnapshot = {
        currentWeightLbs: previousWeightLbs,
        lastCompletedWeightLbs: state.lastCompletedWeightLbs,
        consecutiveFailures: state.consecutiveFailures,
        lastEffortFeedback: outcome.effortFeedback
      };

      return {
        previousWeightLbs,
        nextWeightLbs: previousWeightLbs,
        result: "skipped",
        reason: `No weight progression because ${exercise.exerciseName} is a bodyweight movement and weighted progression is not enabled.`,
        nextState
      };
    }

    if (exercise.isWeightOptional && previousWeightLbs === 0) {
      const nextState: ProgressionStateSnapshot = {
        currentWeightLbs: previousWeightLbs,
        lastCompletedWeightLbs: state.lastCompletedWeightLbs,
        consecutiveFailures: state.consecutiveFailures,
        lastEffortFeedback: outcome.effortFeedback
      };

      return {
        previousWeightLbs,
        nextWeightLbs: previousWeightLbs,
        result: "skipped",
        reason: `No ${loadNoun(loadType)} progression because ${exercise.exerciseName} is weight-optional and you logged 0 lb of ${loadNoun(loadType)}.`,
        nextState
      };
    }

    if (hasEffectiveFailure(outcome, loadType)) {
      return this.calculateFailureResult(effectiveInput, previousWeightLbs);
    }

    if (lastPerformedAt) {
      const gapDays = daysSince({ previous: lastPerformedAt, current: performedAt });

      if (gapDays >= RECENT_TRAINING_REDUCTION_THRESHOLD_DAYS) {
        const nextWeightLbs = applyEasierLoad({
          loadType,
          previousWeightLbs,
          deltaLbs: exercise.incrementLbs,
          incrementLbs: exercise.incrementLbs
        });

        const nextState: ProgressionStateSnapshot = {
          currentWeightLbs: nextWeightLbs,
          lastCompletedWeightLbs: state.lastCompletedWeightLbs,
          consecutiveFailures: 0,
          lastEffortFeedback: outcome.effortFeedback,
          lastPerformedAt: nextLastPerformedAt
        };

        return {
          previousWeightLbs,
          nextWeightLbs,
          result: "reduced",
          reason: "Reduced because this exercise has not been trained in over 30 days.",
          nextState
        };
      }

      if (gapDays >= RECENT_TRAINING_REPEAT_THRESHOLD_DAYS) {
        const nextState: ProgressionStateSnapshot = {
          currentWeightLbs: previousWeightLbs,
          lastCompletedWeightLbs: previousWeightLbs,
          consecutiveFailures: 0,
          lastEffortFeedback: outcome.effortFeedback,
          lastPerformedAt: nextLastPerformedAt
        };

        return {
          previousWeightLbs,
          nextWeightLbs: previousWeightLbs,
          result: "repeated",
          reason: "Repeated because this exercise has not been trained recently.",
          nextState
        };
      }
    }

    if (input.allowRecalibration !== false) {
      const recalibrationResult = this.calculateRecalibrationResult(effectiveInput, previousWeightLbs);
      if (recalibrationResult) {
        return recalibrationResult;
      }
    }

    return this.calculateSuccessResult({ ...effectiveInput, trainingGoal, recoveryState }, previousWeightLbs);
  }

  public calculateDoubleProgression(input: ProgressionComputationInputV2): ProgressionComputationResultV2 {
    const { exercise, outcome: rawOutcome, state } = input;
    const trainingGoal = resolveTrainingGoal(input.trainingGoal);
    const recoveryState = input.recoveryState ?? null;
    const loadType = resolveLoadType(exercise.loadType);

    const previousWeightLbs = roundToTwoDecimals(state.currentWeightLbs);
    const previousRepGoal = state.repGoal;
    const repRangeMin = state.repRangeMin;
    const repRangeMax = state.repRangeMax;
    const lastPerformedAt = state.lastPerformedAt ?? null;
    const performedAt = input.performedAt ?? new Date(0);

    if (!Number.isInteger(previousRepGoal) || !Number.isInteger(repRangeMin) || !Number.isInteger(repRangeMax)) {
      throw new Error("repGoal, repRangeMin, and repRangeMax must be integers.");
    }

    if (repRangeMin <= 0) {
      throw new Error("repRangeMin must be greater than 0.");
    }

    if (repRangeMax < repRangeMin) {
      throw new Error("repRangeMax must be greater than or equal to repRangeMin.");
    }

    if (previousRepGoal < repRangeMin || previousRepGoal > repRangeMax) {
      throw new Error("repGoal must be within the rep range.");
    }

    if (!rawOutcome.sets || rawOutcome.sets.length === 0) {
      throw new Error("Double progression requires per-set outcomes.");
    }

    const { effectiveEffortFeedback } = resolveEffortFeedbackForProgression({
      sets: rawOutcome.sets,
      exerciseFeedback: rawOutcome.effortFeedback,
      incrementLbs: exercise.incrementLbs
    });

    const outcome: ExerciseWorkoutOutcome = {
      ...rawOutcome,
      effortFeedback: effectiveEffortFeedback
    };

    const effortSignals = getSetEffortSignals(outcome.sets!);
    const rirTooEasySignal = shouldTreatRirAsTooEasy(outcome, exercise.incrementLbs);
    const performanceSets = outcome.sets!.filter((set) => set.failureStatus !== "stopped_early");
    if (effortSignals.hasStoppedEarly && performanceSets.length === 0) {
      const nextState: ProgressionStateSnapshotV2 = {
        currentWeightLbs: previousWeightLbs,
        lastCompletedWeightLbs: state.lastCompletedWeightLbs,
        consecutiveFailures: state.consecutiveFailures,
        lastEffortFeedback: outcome.effortFeedback,
        repGoal: previousRepGoal,
        repRangeMin,
        repRangeMax
      };

      return {
        previousWeightLbs,
        nextWeightLbs: previousWeightLbs,
        previousRepGoal,
        nextRepGoal: previousRepGoal,
        result: "repeated",
        reason: "Repeated because one or more sets were marked stopped early.",
        nextState
      };
    }

    if (effortSignals.hasTechnicalFailure) {
      const nextState: ProgressionStateSnapshotV2 = {
        currentWeightLbs: previousWeightLbs,
        lastCompletedWeightLbs: previousWeightLbs,
        consecutiveFailures: 0,
        lastEffortFeedback: outcome.effortFeedback,
        lastPerformedAt,
        repGoal: previousRepGoal,
        repRangeMin,
        repRangeMax
      };

      return {
        previousWeightLbs,
        nextWeightLbs: previousWeightLbs,
        previousRepGoal,
        nextRepGoal: previousRepGoal,
        result: "repeated",
        reason: "Repeated because a set was marked technical failure.",
        nextState
      };
    }

    const setsForProgression = performanceSets.length > 0 ? performanceSets : outcome.sets!;
    const shouldCapIncreaseSteps = effortSignals.hasNearFailure || effortSignals.hasStoppedEarly;

    if (previousWeightLbs < 0) {
      throw new Error("currentWeightLbs must be greater than or equal to 0.");
    }

    if (exercise.incrementLbs <= 0) {
      throw new Error("incrementLbs must be greater than 0.");
    }

    if (exercise.isBodyweight && !exercise.isWeightOptional) {
      const nextState: ProgressionStateSnapshotV2 = {
        currentWeightLbs: previousWeightLbs,
        lastCompletedWeightLbs: state.lastCompletedWeightLbs,
        consecutiveFailures: state.consecutiveFailures,
        lastEffortFeedback: outcome.effortFeedback,
        repGoal: previousRepGoal,
        repRangeMin,
        repRangeMax
      };

      return {
        previousWeightLbs,
        nextWeightLbs: previousWeightLbs,
        previousRepGoal,
        nextRepGoal: previousRepGoal,
        result: "skipped",
        reason: `No progression because ${exercise.exerciseName} is a bodyweight movement and weighted progression is not enabled.`,
        nextState
      };
    }

    if (exercise.isWeightOptional && previousWeightLbs === 0) {
      const nextState: ProgressionStateSnapshotV2 = {
        currentWeightLbs: previousWeightLbs,
        lastCompletedWeightLbs: state.lastCompletedWeightLbs,
        consecutiveFailures: state.consecutiveFailures,
        lastEffortFeedback: outcome.effortFeedback,
        repGoal: previousRepGoal,
        repRangeMin,
        repRangeMax
      };

      return {
        previousWeightLbs,
        nextWeightLbs: previousWeightLbs,
        previousRepGoal,
        nextRepGoal: previousRepGoal,
        result: "skipped",
        reason: `No progression because ${exercise.exerciseName} is weight-optional and you logged 0 lb of ${loadNoun(loadType)}.`,
        nextState
      };
    }

    const hasBelowRangeMin = setsForProgression.some(
      (set) => (set.actualReps ?? 0) < repRangeMin && !isMaterialOverperformanceSet(set, loadType)
    );
    if (hasBelowRangeMin) {
      return this.calculateFailureResultV2(input, previousWeightLbs);
    }

    const metRepGoal = setsForProgression.every(
      (set) => (set.actualReps ?? 0) >= previousRepGoal || isMaterialOverperformanceSet(set, loadType)
    );
    if (!metRepGoal) {
      const nextState: ProgressionStateSnapshotV2 = {
        currentWeightLbs: previousWeightLbs,
        lastCompletedWeightLbs: state.lastCompletedWeightLbs,
        consecutiveFailures: 0,
        lastEffortFeedback: outcome.effortFeedback,
        repGoal: previousRepGoal,
        repRangeMin,
        repRangeMax
      };

      return {
        previousWeightLbs,
        nextWeightLbs: previousWeightLbs,
        previousRepGoal,
        nextRepGoal: previousRepGoal,
        result: "repeated",
        reason: `Repeated because reps were below the current rep goal of ${previousRepGoal} within range ${repRangeMin}-${repRangeMax}.`,
        nextState
      };
    }

    if (lastPerformedAt) {
      const gapDays = daysSince({ previous: lastPerformedAt, current: performedAt });

      if (gapDays >= RECENT_TRAINING_REDUCTION_THRESHOLD_DAYS) {
        const nextWeightLbs = applyEasierLoad({
          loadType,
          previousWeightLbs,
          deltaLbs: exercise.incrementLbs,
          incrementLbs: exercise.incrementLbs
        });
        const nextRepGoal = repRangeMin;

        const nextState: ProgressionStateSnapshotV2 = {
          currentWeightLbs: nextWeightLbs,
          lastCompletedWeightLbs: state.lastCompletedWeightLbs,
          consecutiveFailures: 0,
          lastEffortFeedback: outcome.effortFeedback,
          lastPerformedAt,
          repGoal: nextRepGoal,
          repRangeMin,
          repRangeMax
        };

        return {
          previousWeightLbs,
          nextWeightLbs,
          previousRepGoal,
          nextRepGoal,
          result: "reduced",
          reason: "Reduced because this exercise has not been trained in over 30 days.",
          nextState
        };
      }

      if (gapDays >= RECENT_TRAINING_REPEAT_THRESHOLD_DAYS) {
        const nextState: ProgressionStateSnapshotV2 = {
          currentWeightLbs: previousWeightLbs,
          lastCompletedWeightLbs: previousWeightLbs,
          consecutiveFailures: 0,
          lastEffortFeedback: outcome.effortFeedback,
          lastPerformedAt,
          repGoal: previousRepGoal,
          repRangeMin,
          repRangeMax
        };

        return {
          previousWeightLbs,
          nextWeightLbs: previousWeightLbs,
          previousRepGoal,
          nextRepGoal: previousRepGoal,
          result: "repeated",
          reason: "Repeated because this exercise has not been trained recently.",
          nextState
        };
      }
    }

    if (input.allowRecalibration !== false) {
      const recalibrationResult = this.calculateRecalibrationResultV2(input, previousWeightLbs);
      if (recalibrationResult) {
        return recalibrationResult;
      }
    }

    if (outcome.effortFeedback === "too_hard") {
      const nextState: ProgressionStateSnapshotV2 = {
        currentWeightLbs: previousWeightLbs,
        lastCompletedWeightLbs: previousWeightLbs,
        consecutiveFailures: 0,
        lastEffortFeedback: outcome.effortFeedback,
        lastPerformedAt,
        repGoal: previousRepGoal,
        repRangeMin,
        repRangeMax
      };

      return {
        previousWeightLbs,
        nextWeightLbs: previousWeightLbs,
        previousRepGoal,
        nextRepGoal: previousRepGoal,
        result: "repeated",
        reason: "Repeated because effort was marked too hard.",
        nextState
      };
    }

    if (trainingGoal === "maintenance" && outcome.effortFeedback !== "too_easy") {
      const nextState: ProgressionStateSnapshotV2 = {
        currentWeightLbs: previousWeightLbs,
        lastCompletedWeightLbs: previousWeightLbs,
        consecutiveFailures: 0,
        lastEffortFeedback: outcome.effortFeedback,
        lastPerformedAt,
        repGoal: previousRepGoal,
        repRangeMin,
        repRangeMax
      };

      return {
        previousWeightLbs,
        nextWeightLbs: previousWeightLbs,
        previousRepGoal,
        nextRepGoal: previousRepGoal,
        result: "repeated",
        reason: withPolicySuffix("Repeated because the training goal is maintenance.", {
          trainingGoal,
          experienceLevel: input.experienceLevel ?? null,
          recoveryState
        }),
        nextState
      };
    }

    const strengthRepCeiling = Math.min(repRangeMax, repRangeMin + 1);
    const preferReps = input.preferRepProgressionBeforeWeight ?? true;
    const shouldFavorWeight =
      (!preferReps && repRangeMax > repRangeMin && previousRepGoal >= repRangeMin) ||
      (trainingGoal === "strength" && repRangeMax > repRangeMin && previousRepGoal >= strengthRepCeiling);

    const rir5PlusSetCount = setsForProgression.filter((set) => (set.rir ?? null) === "rir_5_plus").length;
    const hasCleanRir5PlusSignal =
      rir5PlusSetCount >= 2 &&
      !effortSignals.hasNearFailure &&
      !effortSignals.hasTechnicalFailure &&
      !effortSignals.hasStoppedEarly;

    if (
      (recoveryState === "fatigued" || recoveryState === "exhausted") &&
      outcome.effortFeedback !== "too_easy"
    ) {
      const nextState: ProgressionStateSnapshotV2 = {
        currentWeightLbs: previousWeightLbs,
        lastCompletedWeightLbs: previousWeightLbs,
        consecutiveFailures: 0,
        lastEffortFeedback: outcome.effortFeedback,
        lastPerformedAt,
        repGoal: previousRepGoal,
        repRangeMin,
        repRangeMax
      };

      return {
        previousWeightLbs,
        nextWeightLbs: previousWeightLbs,
        previousRepGoal,
        nextRepGoal: previousRepGoal,
        result: "repeated",
        reason: withPolicySuffix("Repeated because the user reported fatigue.", {
          trainingGoal,
          experienceLevel: input.experienceLevel ?? null,
          recoveryState
        }),
        nextState
      };
    }

    if (recoveryState === "exhausted" && !hasExceptionalOverperformance({ outcome, incrementLbs: exercise.incrementLbs })) {
      const nextState: ProgressionStateSnapshotV2 = {
        currentWeightLbs: previousWeightLbs,
        lastCompletedWeightLbs: previousWeightLbs,
        consecutiveFailures: 0,
        lastEffortFeedback: outcome.effortFeedback,
        lastPerformedAt,
        repGoal: previousRepGoal,
        repRangeMin,
        repRangeMax
      };

      return {
        previousWeightLbs,
        nextWeightLbs: previousWeightLbs,
        previousRepGoal,
        nextRepGoal: previousRepGoal,
        result: "repeated",
        reason: withPolicySuffix("Repeated because the user reported being exhausted.", {
          trainingGoal,
          experienceLevel: input.experienceLevel ?? null,
          recoveryState
        }),
        nextState
      };
    }

    if (
      preferReps &&
      !shouldFavorWeight &&
      previousRepGoal < repRangeMax &&
      effectiveEffortFeedback === "too_easy" &&
      hasCleanRir5PlusSignal &&
      recoveryState !== "fatigued" &&
      recoveryState !== "exhausted"
    ) {
      const computedIncreaseSteps =
        repRangeMax > repRangeMin
          ? getRepIncreaseStepCount({
              aggressiveness: input.progressionAggressiveness ?? "balanced",
              category: exercise.exerciseCategory,
              effortFeedback: effectiveEffortFeedback,
              experienceLevel: input.experienceLevel ?? null,
              recoveryState
            })
          : 1;
      const increaseSteps = shouldCapIncreaseSteps ? 1 : computedIncreaseSteps;
      const nextRepGoal = clampInteger(previousRepGoal + increaseSteps, repRangeMin, repRangeMax);
      const nextWeightLbs = applyHarderLoad({
        loadType,
        previousWeightLbs,
        deltaLbs: exercise.incrementLbs,
        incrementLbs: exercise.incrementLbs
      });
      const nextState: ProgressionStateSnapshotV2 = {
        currentWeightLbs: nextWeightLbs,
        lastCompletedWeightLbs: previousWeightLbs,
        consecutiveFailures: 0,
        lastEffortFeedback: outcome.effortFeedback,
        lastPerformedAt,
        repGoal: nextRepGoal,
        repRangeMin,
        repRangeMax
      };

      return {
        previousWeightLbs,
        nextWeightLbs,
        previousRepGoal,
        nextRepGoal,
        result: "increased",
        reason: withPolicySuffix(
          `${
            loadType === "assistance"
              ? `Reduced ${loadNoun(loadType)} from ${previousWeightLbs} to ${nextWeightLbs}`
              : `Increased ${loadNoun(loadType)} from ${previousWeightLbs} to ${nextWeightLbs}`
          } and reps from ${previousRepGoal} to ${nextRepGoal} within range ${repRangeMin}-${repRangeMax} because effort was marked too easy and sets indicated 5+ reps in reserve.`,
          { trainingGoal, experienceLevel: input.experienceLevel ?? null, recoveryState }
        ),
        nextState
      };
    }

    if (!shouldFavorWeight && previousRepGoal < repRangeMax) {
      const computedIncreaseSteps =
        repRangeMax > repRangeMin
          ? getRepIncreaseStepCount({
              aggressiveness: input.progressionAggressiveness ?? "balanced",
              category: exercise.exerciseCategory,
              effortFeedback: effectiveEffortFeedback,
              experienceLevel: input.experienceLevel ?? null,
              recoveryState
            })
          : 1;
      const increaseSteps = shouldCapIncreaseSteps ? 1 : computedIncreaseSteps;
      const nextRepGoal = clampInteger(previousRepGoal + increaseSteps, repRangeMin, repRangeMax);
      const nextState: ProgressionStateSnapshotV2 = {
        currentWeightLbs: previousWeightLbs,
        lastCompletedWeightLbs: previousWeightLbs,
        consecutiveFailures: 0,
        lastEffortFeedback: outcome.effortFeedback,
        lastPerformedAt,
        repGoal: nextRepGoal,
        repRangeMin,
        repRangeMax
      };

      return {
        previousWeightLbs,
        nextWeightLbs: previousWeightLbs,
        previousRepGoal,
        nextRepGoal,
        result: "increased",
        reason: `Increased reps from ${previousRepGoal} to ${nextRepGoal} within range ${repRangeMin}-${repRangeMax}.`,
        nextState
      };
    }

    if ((trainingGoal === "endurance" || trainingGoal === "general_fitness") && outcome.effortFeedback !== "too_easy") {
      const nextState: ProgressionStateSnapshotV2 = {
        currentWeightLbs: previousWeightLbs,
        lastCompletedWeightLbs: previousWeightLbs,
        consecutiveFailures: 0,
        lastEffortFeedback: outcome.effortFeedback,
        lastPerformedAt,
        repGoal: previousRepGoal,
        repRangeMin,
        repRangeMax
      };

      return {
        previousWeightLbs,
        nextWeightLbs: previousWeightLbs,
        previousRepGoal,
        nextRepGoal: previousRepGoal,
        result: "repeated",
        reason: withPolicySuffix(
          `Repeated at the top of the rep range because the goal (${trainingGoal}) prioritizes reps/volume before load.`,
          { trainingGoal, experienceLevel: input.experienceLevel ?? null, recoveryState }
        ),
        nextState
      };
    }

    if (recoveryState === "fatigued") {
      const nextState: ProgressionStateSnapshotV2 = {
        currentWeightLbs: previousWeightLbs,
        lastCompletedWeightLbs: previousWeightLbs,
        consecutiveFailures: 0,
        lastEffortFeedback: outcome.effortFeedback,
        lastPerformedAt,
        repGoal: previousRepGoal,
        repRangeMin,
        repRangeMax
      };

      return {
        previousWeightLbs,
        nextWeightLbs: previousWeightLbs,
        previousRepGoal,
        nextRepGoal: previousRepGoal,
        result: "repeated",
        reason: withPolicySuffix("Repeated instead of increasing load because the user reported fatigue.", {
          trainingGoal,
          experienceLevel: input.experienceLevel ?? null,
          recoveryState
        }),
        nextState
      };
    }

    const computedRawIncreaseSteps =
      repRangeMax > repRangeMin
        ? getAggressiveSuccessStepCount({
            category: exercise.exerciseCategory,
            effortFeedback: effectiveEffortFeedback,
            experienceLevel: input.experienceLevel ?? null,
            recoveryState
          })
        : 1;
    const rawIncreaseSteps = shouldCapIncreaseSteps ? 1 : computedRawIncreaseSteps;
    const increaseSteps =
      trainingGoal === "hypertrophy" || trainingGoal === "endurance" || trainingGoal === "general_fitness"
        ? 1
        : rawIncreaseSteps;
    const increaseLbs = roundToTwoDecimals(increaseSteps * exercise.incrementLbs);
    const nextWeightLbs = applyHarderLoad({
      loadType,
      previousWeightLbs,
      deltaLbs: increaseLbs,
      incrementLbs: exercise.incrementLbs
    });
    const nextRepGoal = repRangeMin;
    const nextState: ProgressionStateSnapshotV2 = {
      currentWeightLbs: nextWeightLbs,
      lastCompletedWeightLbs: previousWeightLbs,
      consecutiveFailures: 0,
      lastEffortFeedback: outcome.effortFeedback,
      lastPerformedAt,
      repGoal: nextRepGoal,
      repRangeMin,
      repRangeMax
    };

    return {
      previousWeightLbs,
      nextWeightLbs,
      previousRepGoal,
      nextRepGoal,
      result: "increased",
      reason: withPolicySuffix(
        `${
          loadType === "assistance"
            ? `Reduced ${loadNoun(loadType)} from ${previousWeightLbs} to ${nextWeightLbs}`
            : `Increased ${loadNoun(loadType)} from ${previousWeightLbs} to ${nextWeightLbs}`
        } and reset reps to ${repRangeMin}.${
          rirTooEasySignal
            ? loadType === "assistance"
              ? " (Set effort suggested assistance was too high.)"
              : " (Set effort suggested the weight was too light.)"
            : ""
        }`,
        { trainingGoal, experienceLevel: input.experienceLevel ?? null, recoveryState }
      ),
      nextState
    };
  }

  private calculateFixedWeight(input: ProgressionComputationInputV2): ProgressionComputationResultV2 {
    const { state, outcome, exercise } = input;
    const trainingGoal = resolveTrainingGoal(input.trainingGoal);
    const recoveryState = input.recoveryState ?? null;

    const fixedRepGoal = state.repGoal;
    const repRangeMin = state.repRangeMin;
    const repRangeMax = state.repRangeMax;

    const base = this.calculate({
      ...(input.performedAt ? { performedAt: input.performedAt } : {}),
      state: {
        currentWeightLbs: state.currentWeightLbs,
        lastCompletedWeightLbs: state.lastCompletedWeightLbs,
        consecutiveFailures: state.consecutiveFailures,
        lastEffortFeedback: state.lastEffortFeedback,
        lastPerformedAt: state.lastPerformedAt ?? null
      },
      exercise,
      outcome: {
        effortFeedback: outcome.effortFeedback,
        ...(outcome.sets ? { sets: outcome.sets } : {}),
        ...(typeof outcome.hasFailure === "boolean" ? { hasFailure: outcome.hasFailure } : {})
      },
      experienceLevel: input.experienceLevel ?? null,
      trainingGoal,
      recoveryState
    });

    const nextState: ProgressionStateSnapshotV2 = {
      currentWeightLbs: base.nextState.currentWeightLbs,
      lastCompletedWeightLbs: base.nextState.lastCompletedWeightLbs,
      consecutiveFailures: base.nextState.consecutiveFailures,
      lastEffortFeedback: base.nextState.lastEffortFeedback,
      lastPerformedAt: base.nextState.lastPerformedAt ?? null,
      repGoal: fixedRepGoal,
      repRangeMin,
      repRangeMax
    };

    return {
      previousWeightLbs: base.previousWeightLbs,
      nextWeightLbs: base.nextWeightLbs,
      previousRepGoal: fixedRepGoal,
      nextRepGoal: fixedRepGoal,
      result: base.result,
      reason: base.reason,
      nextState
    };
  }

  private calculateBodyweightWeighted(input: ProgressionComputationInputV2): ProgressionComputationResultV2 {
    const { state, exercise } = input;
    const recoveryState = input.recoveryState ?? null;

    if (exercise.isBodyweight && !exercise.isWeightOptional) {
      const previousWeightLbs = roundToTwoDecimals(state.currentWeightLbs);
      const previousRepGoal = state.repGoal;
      const repRangeMin = state.repRangeMin;
      const repRangeMax = state.repRangeMax;

      const nextState: ProgressionStateSnapshotV2 = {
        currentWeightLbs: previousWeightLbs,
        lastCompletedWeightLbs: state.lastCompletedWeightLbs,
        consecutiveFailures: state.consecutiveFailures,
        lastEffortFeedback: input.outcome.effortFeedback,
        lastPerformedAt: state.lastPerformedAt ?? null,
        repGoal: previousRepGoal,
        repRangeMin,
        repRangeMax
      };

      return {
        previousWeightLbs,
        nextWeightLbs: previousWeightLbs,
        previousRepGoal,
        nextRepGoal: previousRepGoal,
        result: "skipped",
        reason: `No progression because ${exercise.exerciseName} is a bodyweight movement and weighted progression is not enabled.`,
        nextState
      };
    }

    // Unlike double progression, allow progression to proceed when current external load is 0.
    const nextExercise = {
      ...exercise,
      isWeightOptional: false,
      isBodyweight: false
    };

    return this.calculateDoubleProgression({
      ...input,
      exercise: nextExercise,
      recoveryState
    });
  }

  private calculateBodyweightReps(input: ProgressionComputationInputV2): ProgressionComputationResultV2 {
    const { exercise, outcome, state } = input;
    const trainingGoal = resolveTrainingGoal(input.trainingGoal);
    const recoveryState = input.recoveryState ?? null;
    const loadType = resolveLoadType(exercise.loadType);

    const previousWeightLbs = roundToTwoDecimals(state.currentWeightLbs);
    const previousRepGoal = state.repGoal;
    const repRangeMin = state.repRangeMin;
    const repRangeMax = state.repRangeMax;
    const lastPerformedAt = state.lastPerformedAt ?? null;

    if (!Number.isInteger(previousRepGoal) || !Number.isInteger(repRangeMin) || !Number.isInteger(repRangeMax)) {
      throw new Error("repGoal, repRangeMin, and repRangeMax must be integers.");
    }

    if (repRangeMin <= 0) {
      throw new Error("repRangeMin must be greater than 0.");
    }

    if (repRangeMax < repRangeMin) {
      throw new Error("repRangeMax must be greater than or equal to repRangeMin.");
    }

    if (previousRepGoal < repRangeMin || previousRepGoal > repRangeMax) {
      throw new Error("repGoal must be within the rep range.");
    }

    if (!outcome.sets || outcome.sets.length === 0) {
      throw new Error("bodyweight_reps requires per-set outcomes.");
    }

    if (exercise.isBodyweight && exercise.isWeightOptional && previousWeightLbs > 0) {
      // If the user is logging external load, steer them toward bodyweight_weighted.
      const nextState: ProgressionStateSnapshotV2 = {
        currentWeightLbs: previousWeightLbs,
        lastCompletedWeightLbs: state.lastCompletedWeightLbs,
        consecutiveFailures: state.consecutiveFailures,
        lastEffortFeedback: outcome.effortFeedback,
        lastPerformedAt,
        repGoal: previousRepGoal,
        repRangeMin,
        repRangeMax
      };

      return {
        previousWeightLbs,
        nextWeightLbs: previousWeightLbs,
        previousRepGoal,
        nextRepGoal: previousRepGoal,
        result: "skipped",
        reason: `No reps-only progression because ${exercise.exerciseName} is tracking external load; use bodyweight_weighted instead.`,
        nextState
      };
    }

    const hasBelowRangeMin = outcome.sets.some(
      (set) => (set.actualReps ?? 0) < repRangeMin && !isMaterialOverperformanceSet(set, loadType)
    );
    if (hasBelowRangeMin) {
      const nextFailureCount = state.consecutiveFailures + 1;
      if (nextFailureCount >= 2) {
        const nextRepGoal = repRangeMin;
        const nextState: ProgressionStateSnapshotV2 = {
          currentWeightLbs: previousWeightLbs,
          lastCompletedWeightLbs: state.lastCompletedWeightLbs,
          consecutiveFailures: 0,
          lastEffortFeedback: outcome.effortFeedback,
          lastPerformedAt,
          repGoal: nextRepGoal,
          repRangeMin,
          repRangeMax
        };

        return {
          previousWeightLbs,
          nextWeightLbs: previousWeightLbs,
          previousRepGoal,
          nextRepGoal,
          result: "reduced",
          reason: "Reduced reps after consecutive failures and reset to the bottom of the range.",
          nextState
        };
      }

      const nextState: ProgressionStateSnapshotV2 = {
        currentWeightLbs: previousWeightLbs,
        lastCompletedWeightLbs: state.lastCompletedWeightLbs,
        consecutiveFailures: nextFailureCount,
        lastEffortFeedback: outcome.effortFeedback,
        lastPerformedAt,
        repGoal: previousRepGoal,
        repRangeMin,
        repRangeMax
      };

      return {
        previousWeightLbs,
        nextWeightLbs: previousWeightLbs,
        previousRepGoal,
        nextRepGoal: previousRepGoal,
        result: "repeated",
        reason: "Repeated because reps were below the target range minimum.",
        nextState
      };
    }

    const metRepGoal = outcome.sets.every(
      (set) => (set.actualReps ?? 0) >= previousRepGoal || isMaterialOverperformanceSet(set, loadType)
    );
    if (!metRepGoal) {
      const nextState: ProgressionStateSnapshotV2 = {
        currentWeightLbs: previousWeightLbs,
        lastCompletedWeightLbs: state.lastCompletedWeightLbs,
        consecutiveFailures: 0,
        lastEffortFeedback: outcome.effortFeedback,
        lastPerformedAt,
        repGoal: previousRepGoal,
        repRangeMin,
        repRangeMax
      };

      return {
        previousWeightLbs,
        nextWeightLbs: previousWeightLbs,
        previousRepGoal,
        nextRepGoal: previousRepGoal,
        result: "repeated",
        reason: `Repeated because reps were below the current rep goal of ${previousRepGoal} within range ${repRangeMin}-${repRangeMax}.`,
        nextState
      };
    }

    if (outcome.effortFeedback === "too_hard") {
      const nextState: ProgressionStateSnapshotV2 = {
        currentWeightLbs: previousWeightLbs,
        lastCompletedWeightLbs: previousWeightLbs,
        consecutiveFailures: 0,
        lastEffortFeedback: outcome.effortFeedback,
        lastPerformedAt,
        repGoal: previousRepGoal,
        repRangeMin,
        repRangeMax
      };

      return {
        previousWeightLbs,
        nextWeightLbs: previousWeightLbs,
        previousRepGoal,
        nextRepGoal: previousRepGoal,
        result: "repeated",
        reason: "Repeated because effort was marked too hard.",
        nextState
      };
    }

    if (trainingGoal === "maintenance" && outcome.effortFeedback !== "too_easy") {
      const nextState: ProgressionStateSnapshotV2 = {
        currentWeightLbs: previousWeightLbs,
        lastCompletedWeightLbs: previousWeightLbs,
        consecutiveFailures: 0,
        lastEffortFeedback: outcome.effortFeedback,
        lastPerformedAt,
        repGoal: previousRepGoal,
        repRangeMin,
        repRangeMax
      };

      return {
        previousWeightLbs,
        nextWeightLbs: previousWeightLbs,
        previousRepGoal,
        nextRepGoal: previousRepGoal,
        result: "repeated",
        reason: withPolicySuffix("Repeated because the training goal is maintenance.", {
          trainingGoal,
          experienceLevel: input.experienceLevel ?? null,
          recoveryState
        }),
        nextState
      };
    }

    if ((recoveryState === "fatigued" || recoveryState === "exhausted") && outcome.effortFeedback !== "too_easy") {
      const nextState: ProgressionStateSnapshotV2 = {
        currentWeightLbs: previousWeightLbs,
        lastCompletedWeightLbs: previousWeightLbs,
        consecutiveFailures: 0,
        lastEffortFeedback: outcome.effortFeedback,
        lastPerformedAt,
        repGoal: previousRepGoal,
        repRangeMin,
        repRangeMax
      };

      return {
        previousWeightLbs,
        nextWeightLbs: previousWeightLbs,
        previousRepGoal,
        nextRepGoal: previousRepGoal,
        result: "repeated",
        reason: withPolicySuffix("Repeated because the user reported fatigue.", {
          trainingGoal,
          experienceLevel: input.experienceLevel ?? null,
          recoveryState
        }),
        nextState
      };
    }

    if (recoveryState === "exhausted" && !hasExceptionalOverperformance({ outcome, incrementLbs: exercise.incrementLbs })) {
      const nextState: ProgressionStateSnapshotV2 = {
        currentWeightLbs: previousWeightLbs,
        lastCompletedWeightLbs: previousWeightLbs,
        consecutiveFailures: 0,
        lastEffortFeedback: outcome.effortFeedback,
        lastPerformedAt,
        repGoal: previousRepGoal,
        repRangeMin,
        repRangeMax
      };

      return {
        previousWeightLbs,
        nextWeightLbs: previousWeightLbs,
        previousRepGoal,
        nextRepGoal: previousRepGoal,
        result: "repeated",
        reason: withPolicySuffix("Repeated because the user reported being exhausted.", {
          trainingGoal,
          experienceLevel: input.experienceLevel ?? null,
          recoveryState
        }),
        nextState
      };
    }

    if (recoveryState === "fatigued" && !hasExceptionalOverperformance({ outcome, incrementLbs: exercise.incrementLbs })) {
      const nextState: ProgressionStateSnapshotV2 = {
        currentWeightLbs: previousWeightLbs,
        lastCompletedWeightLbs: previousWeightLbs,
        consecutiveFailures: 0,
        lastEffortFeedback: outcome.effortFeedback,
        lastPerformedAt,
        repGoal: previousRepGoal,
        repRangeMin,
        repRangeMax
      };

      return {
        previousWeightLbs,
        nextWeightLbs: previousWeightLbs,
        previousRepGoal,
        nextRepGoal: previousRepGoal,
        result: "repeated",
        reason: withPolicySuffix("Repeated instead of progressing because the user reported fatigue.", {
          trainingGoal,
          experienceLevel: input.experienceLevel ?? null,
          recoveryState
        }),
        nextState
      };
    }

    if (previousRepGoal < repRangeMax) {
      const increaseSteps =
        repRangeMax > repRangeMin
          ? getRepIncreaseStepCount({
              aggressiveness: input.progressionAggressiveness ?? "balanced",
              category: exercise.exerciseCategory,
              effortFeedback: outcome.effortFeedback,
              experienceLevel: input.experienceLevel ?? null,
              recoveryState
            })
          : 1;
      const nextRepGoal = clampInteger(previousRepGoal + increaseSteps, repRangeMin, repRangeMax);
      const nextState: ProgressionStateSnapshotV2 = {
        currentWeightLbs: previousWeightLbs,
        lastCompletedWeightLbs: previousWeightLbs,
        consecutiveFailures: 0,
        lastEffortFeedback: outcome.effortFeedback,
        lastPerformedAt,
        repGoal: nextRepGoal,
        repRangeMin,
        repRangeMax
      };

      return {
        previousWeightLbs,
        nextWeightLbs: previousWeightLbs,
        previousRepGoal,
        nextRepGoal,
        result: "increased",
        reason: `Increased reps from ${previousRepGoal} to ${nextRepGoal} within range ${repRangeMin}-${repRangeMax}.`,
        nextState
      };
    }

    const nextState: ProgressionStateSnapshotV2 = {
      currentWeightLbs: previousWeightLbs,
      lastCompletedWeightLbs: previousWeightLbs,
      consecutiveFailures: 0,
      lastEffortFeedback: outcome.effortFeedback,
      lastPerformedAt,
      repGoal: previousRepGoal,
      repRangeMin,
      repRangeMax
    };

    return {
      previousWeightLbs,
      nextWeightLbs: previousWeightLbs,
      previousRepGoal,
      nextRepGoal: previousRepGoal,
      result: "repeated",
      reason: `Repeated because reps are already at the top of the range ${repRangeMin}-${repRangeMax}.`,
      nextState
    };
  }

  private calculateFailureResult(
    input: ProgressionComputationInput,
    previousWeightLbs: number
  ): ProgressionComputationResult {
    const { exercise, outcome, state } = input;
    const loadType = resolveLoadType(exercise.loadType);

    if (input.allowAutoDeload !== false && state.consecutiveFailures >= 1) {
      const deloadMultiplier = loadType === "assistance" ? 1.1 : 0.9;
      const attemptedDeloadWeight = roundToTwoDecimals(previousWeightLbs * deloadMultiplier);
      let nextWeightLbs =
        loadType === "assistance"
          ? roundUpToIncrement(attemptedDeloadWeight, exercise.incrementLbs)
          : roundDownToIncrement(attemptedDeloadWeight, exercise.incrementLbs);

      if (nextWeightLbs === previousWeightLbs) {
        nextWeightLbs = applyEasierLoad({
          loadType,
          previousWeightLbs,
          deltaLbs: exercise.incrementLbs,
          incrementLbs: exercise.incrementLbs
        });
      }

      const nextState: ProgressionStateSnapshot = {
        currentWeightLbs: nextWeightLbs,
        lastCompletedWeightLbs: state.lastCompletedWeightLbs,
        consecutiveFailures: 0,
        lastEffortFeedback: outcome.effortFeedback
      };

      const roundingNote = (() => {
        if (nextWeightLbs === attemptedDeloadWeight) {
          return "";
        }
        return loadType === "assistance"
          ? ` (rounded up to ${exercise.incrementLbs} lb increments)`
          : ` (rounded down to ${exercise.incrementLbs} lb increments)`;
      })();

      return {
        previousWeightLbs,
        nextWeightLbs,
        result: "reduced",
        reason: `Adjusted ${loadNoun(loadType)} from ${previousWeightLbs} lb to ${nextWeightLbs} lb after two consecutive failed workouts (10% deload)${roundingNote}.`,
        nextState
      };
    }

    if (input.allowAutoDeload === false && state.consecutiveFailures >= 1) {
      const nextState: ProgressionStateSnapshot = {
        currentWeightLbs: previousWeightLbs,
        lastCompletedWeightLbs: state.lastCompletedWeightLbs,
        consecutiveFailures: state.consecutiveFailures + 1,
        lastEffortFeedback: outcome.effortFeedback
      };

      return {
        previousWeightLbs,
        nextWeightLbs: previousWeightLbs,
        result: "repeated",
        reason: `Repeated ${previousWeightLbs} lb of ${loadNoun(loadType)} because sets missed the prescribed reps and auto-deload is disabled.`,
        nextState
      };
    }

    const nextState: ProgressionStateSnapshot = {
      currentWeightLbs: previousWeightLbs,
      lastCompletedWeightLbs: state.lastCompletedWeightLbs,
      consecutiveFailures: state.consecutiveFailures + 1,
      lastEffortFeedback: outcome.effortFeedback
    };

    return {
      previousWeightLbs,
      nextWeightLbs: previousWeightLbs,
      result: "repeated",
      reason: `Repeated ${previousWeightLbs} lb of ${loadNoun(loadType)} because at least one set missed the prescribed reps.`,
      nextState
    };
  }

  private calculateFailureResultV2(
    input: ProgressionComputationInputV2,
    previousWeightLbs: number
  ): ProgressionComputationResultV2 {
    const { exercise, outcome, state } = input;
    const loadType = resolveLoadType(exercise.loadType);

    const previousRepGoal = state.repGoal;
    const repRangeMin = state.repRangeMin;
    const repRangeMax = state.repRangeMax;

    const nextFailureCount = state.consecutiveFailures + 1;

    if (input.allowAutoDeload !== false && nextFailureCount >= 2) {
      const nextWeightLbs = applyEasierLoad({
        loadType,
        previousWeightLbs,
        deltaLbs: exercise.incrementLbs,
        incrementLbs: exercise.incrementLbs
      });
      const nextRepGoal = repRangeMin;

      const nextState: ProgressionStateSnapshotV2 = {
        currentWeightLbs: nextWeightLbs,
        lastCompletedWeightLbs: state.lastCompletedWeightLbs,
        consecutiveFailures: 0,
        lastEffortFeedback: outcome.effortFeedback,
        repGoal: nextRepGoal,
        repRangeMin,
        repRangeMax
      };

      return {
        previousWeightLbs,
        nextWeightLbs,
        previousRepGoal,
        nextRepGoal,
        result: "reduced",
        reason:
          loadType === "assistance"
            ? "Increased assistance after consecutive failures and reset reps to the bottom of the range."
            : "Reduced weight after consecutive failures and reset reps to the bottom of the range.",
        nextState
      };
    }

    if (input.allowAutoDeload === false && nextFailureCount >= 2) {
      const nextState: ProgressionStateSnapshotV2 = {
        currentWeightLbs: previousWeightLbs,
        lastCompletedWeightLbs: state.lastCompletedWeightLbs,
        consecutiveFailures: nextFailureCount,
        lastEffortFeedback: outcome.effortFeedback,
        repGoal: previousRepGoal,
        repRangeMin,
        repRangeMax
      };

      return {
        previousWeightLbs,
        nextWeightLbs: previousWeightLbs,
        previousRepGoal,
        nextRepGoal: previousRepGoal,
        result: "repeated",
        reason: "Repeated because reps were below the target range minimum and auto-deload is disabled.",
        nextState
      };
    }

    const nextState: ProgressionStateSnapshotV2 = {
      currentWeightLbs: previousWeightLbs,
      lastCompletedWeightLbs: state.lastCompletedWeightLbs,
      consecutiveFailures: nextFailureCount,
      lastEffortFeedback: outcome.effortFeedback,
      repGoal: previousRepGoal,
      repRangeMin,
      repRangeMax
    };

    return {
      previousWeightLbs,
      nextWeightLbs: previousWeightLbs,
      previousRepGoal,
      nextRepGoal: previousRepGoal,
      result: "repeated",
      reason: "Repeated because reps were below the target range minimum.",
      nextState
    };
  }

  private calculateSuccessResult(
    input: ProgressionComputationInput,
    previousWeightLbs: number
  ): ProgressionComputationResult {
    const { exercise, outcome } = input;
    const trainingGoal = resolveTrainingGoal(input.trainingGoal);
    const recoveryState = input.recoveryState ?? null;
    const loadType = resolveLoadType(exercise.loadType);

    const effortSignals = getSetEffortSignals(outcome.sets);
    const rirTooEasySignal = shouldTreatRirAsTooEasy(outcome, exercise.incrementLbs);
    const effectiveEffortFeedback = outcome.effortFeedback;

    const performanceSets = (outcome.sets ?? []).filter((set) => set.failureStatus !== "stopped_early");
    if (effortSignals.hasStoppedEarly && performanceSets.length === 0) {
      const nextState: ProgressionStateSnapshot = {
        currentWeightLbs: previousWeightLbs,
        lastCompletedWeightLbs: previousWeightLbs,
        consecutiveFailures: 0,
        lastEffortFeedback: outcome.effortFeedback
      };

      return {
        previousWeightLbs,
        nextWeightLbs: previousWeightLbs,
        result: "repeated",
        reason: "Repeated because one or more sets were marked stopped early.",
        nextState
      };
    }

    if (effortSignals.hasTechnicalFailure) {
      const nextState: ProgressionStateSnapshot = {
        currentWeightLbs: previousWeightLbs,
        lastCompletedWeightLbs: previousWeightLbs,
        consecutiveFailures: 0,
        lastEffortFeedback: outcome.effortFeedback
      };

      return {
        previousWeightLbs,
        nextWeightLbs: previousWeightLbs,
        result: "repeated",
        reason: "Repeated because a set was marked technical failure.",
        nextState
      };
    }

    const shouldCapIncreaseSteps = effortSignals.hasNearFailure || effortSignals.hasStoppedEarly;

    if (effectiveEffortFeedback === "too_hard") {
      const nextState: ProgressionStateSnapshot = {
        currentWeightLbs: previousWeightLbs,
        lastCompletedWeightLbs: previousWeightLbs,
        consecutiveFailures: 0,
        lastEffortFeedback: effectiveEffortFeedback
      };

      return {
        previousWeightLbs,
        nextWeightLbs: previousWeightLbs,
        result: "repeated",
        reason: `Repeated ${previousWeightLbs} lb because the work was completed but effort was marked too hard.`,
        nextState
      };
    }

    if (trainingGoal === "maintenance" && effectiveEffortFeedback !== "too_easy") {
      const nextState: ProgressionStateSnapshot = {
        currentWeightLbs: previousWeightLbs,
        lastCompletedWeightLbs: previousWeightLbs,
        consecutiveFailures: 0,
        lastEffortFeedback: effectiveEffortFeedback
      };

      return {
        previousWeightLbs,
        nextWeightLbs: previousWeightLbs,
        result: "repeated",
        reason: withPolicySuffix("Repeated because the training goal is maintenance.", {
          trainingGoal,
          experienceLevel: input.experienceLevel ?? null,
          recoveryState
        }),
        nextState
      };
    }

    if ((recoveryState === "fatigued" || recoveryState === "exhausted") && effectiveEffortFeedback !== "too_easy") {
      const nextState: ProgressionStateSnapshot = {
        currentWeightLbs: previousWeightLbs,
        lastCompletedWeightLbs: previousWeightLbs,
        consecutiveFailures: 0,
        lastEffortFeedback: outcome.effortFeedback
      };

      return {
        previousWeightLbs,
        nextWeightLbs: previousWeightLbs,
        result: "repeated",
        reason: withPolicySuffix("Repeated because the user reported fatigue.", {
          trainingGoal,
          experienceLevel: input.experienceLevel ?? null,
          recoveryState
        }),
        nextState
      };
    }

    if (recoveryState === "exhausted" && !hasExceptionalOverperformance({ outcome, incrementLbs: exercise.incrementLbs })) {
      const nextState: ProgressionStateSnapshot = {
        currentWeightLbs: previousWeightLbs,
        lastCompletedWeightLbs: previousWeightLbs,
        consecutiveFailures: 0,
        lastEffortFeedback: outcome.effortFeedback
      };

      return {
        previousWeightLbs,
        nextWeightLbs: previousWeightLbs,
        result: "repeated",
        reason: withPolicySuffix("Repeated because the user reported being exhausted.", {
          trainingGoal,
          experienceLevel: input.experienceLevel ?? null,
          recoveryState
        }),
        nextState
      };
    }

    if (recoveryState === "fatigued" && !hasExceptionalOverperformance({ outcome, incrementLbs: exercise.incrementLbs })) {
      const nextState: ProgressionStateSnapshot = {
        currentWeightLbs: previousWeightLbs,
        lastCompletedWeightLbs: previousWeightLbs,
        consecutiveFailures: 0,
        lastEffortFeedback: outcome.effortFeedback
      };

      return {
        previousWeightLbs,
        nextWeightLbs: previousWeightLbs,
        result: "repeated",
        reason: withPolicySuffix("Repeated instead of increasing load because the user reported fatigue.", {
          trainingGoal,
          experienceLevel: input.experienceLevel ?? null,
          recoveryState
        }),
        nextState
      };
    }

    const computedRawIncreaseSteps = getRepIncreaseStepCount({
      aggressiveness: input.progressionAggressiveness ?? "balanced",
      category: exercise.exerciseCategory,
      effortFeedback: effectiveEffortFeedback,
      experienceLevel: input.experienceLevel ?? null,
      recoveryState
    });
    const rawIncreaseSteps = shouldCapIncreaseSteps ? 1 : computedRawIncreaseSteps;
    const increaseSteps =
      trainingGoal === "hypertrophy" || trainingGoal === "endurance" || trainingGoal === "general_fitness"
        ? 1
        : rawIncreaseSteps;
    const increaseLbs = roundToTwoDecimals(increaseSteps * exercise.incrementLbs);

    const nextWeightLbs = applyHarderLoad({
      loadType,
      previousWeightLbs,
      deltaLbs: increaseLbs,
      incrementLbs: exercise.incrementLbs
    });
    const nextState: ProgressionStateSnapshot = {
      currentWeightLbs: nextWeightLbs,
      lastCompletedWeightLbs: previousWeightLbs,
      consecutiveFailures: 0,
      lastEffortFeedback: outcome.effortFeedback
    };

    return {
      previousWeightLbs,
      nextWeightLbs,
      result: "increased",
      reason: withPolicySuffix(
        effectiveEffortFeedback === "too_easy"
          ? loadType === "assistance"
            ? `Reduced ${loadNoun(loadType)} from ${previousWeightLbs} lb to ${nextWeightLbs} lb because all sets were completed and the set-level effort suggests assistance was too high.`
            : `Increased ${loadNoun(loadType)} from ${previousWeightLbs} lb to ${nextWeightLbs} lb because all sets were completed and the set-level effort suggests the weight was too light.`
          : loadType === "assistance"
            ? `Reduced ${loadNoun(loadType)} from ${previousWeightLbs} lb to ${nextWeightLbs} lb because all sets were completed and effort was marked manageable.`
            : `Increased ${loadNoun(loadType)} from ${previousWeightLbs} lb to ${nextWeightLbs} lb because all sets were completed and effort was marked manageable.`,
        { trainingGoal, experienceLevel: input.experienceLevel ?? null, recoveryState }
      ),
      nextState
    };
  }

  private calculateRecalibrationResult(
    input: ProgressionComputationInput,
    previousWeightLbs: number
  ): ProgressionComputationResult | null {
    const { exercise, outcome } = input;
    const loadType = resolveLoadType(exercise.loadType);

    // Assisted movements (e.g., assisted pull-up) log "assistance" weight, where lower is harder.
    // The current recalibration model assumes higher logged weight is harder (external load),
    // so skip recalibration until we have an assistance-aware model.
    if (loadType === "assistance") {
      return null;
    }

    const effortSignals = getSetEffortSignals(outcome.sets);
    if (effortSignals.hasNearFailure || effortSignals.hasTechnicalFailure || effortSignals.hasStoppedEarly) {
      return null;
    }

    const performanceSets = (outcome.sets ?? []).filter((set) => set.failureStatus !== "stopped_early");
    const weightQualifyingSets = performanceSets.filter((set) => isMaterialOverperformanceSet(set, loadType));
    const repQualifyingSets = performanceSets.filter(
      (set) =>
        isMaterialRepOverperformanceSet(set, exercise.incrementLbs) ||
        isRirSupportedRepOverperformanceSet(set, exercise.incrementLbs)
    );

    const useWeightSignal = weightQualifyingSets.length >= MIN_RECALIBRATION_SET_COUNT;
    const useRepSignal =
      !useWeightSignal &&
      (repQualifyingSets.length >= MIN_RECALIBRATION_SET_COUNT || repQualifyingSets.some(isExtremeRepOverperformanceSet));

    if (!useWeightSignal && !useRepSignal) {
      return null;
    }

    const qualifyingSets = useWeightSignal ? weightQualifyingSets : repQualifyingSets;

    const estimatedOneRepMaxes = qualifyingSets.map((set) =>
      estimateOneRepMaxEpley(set.actualWeightLbs!, set.actualReps!)
    );
    const targetRepCounts = qualifyingSets.map((set) => set.targetReps);
    const representativeE1rm = median(estimatedOneRepMaxes);
    const representativeTargetReps = median(targetRepCounts);
    const uncappedWorkingWeight = estimateWorkingWeightFromOneRepMax(
      representativeE1rm,
      representativeTargetReps
    );
    const cappedWorkingWeight = Math.min(
      uncappedWorkingWeight,
      previousWeightLbs * MAX_RECALIBRATION_JUMP_MULTIPLIER
    );
    const nextWeightLbs = roundDownToIncrement(cappedWorkingWeight, exercise.incrementLbs);

    const tooEasyIncreaseCap = roundToTwoDecimals(2 * exercise.incrementLbs);
    if (nextWeightLbs <= previousWeightLbs + tooEasyIncreaseCap) {
      return null;
    }

    const nextState: ProgressionStateSnapshot = {
      currentWeightLbs: nextWeightLbs,
      lastCompletedWeightLbs: nextWeightLbs,
      consecutiveFailures: 0,
      lastEffortFeedback: outcome.effortFeedback
    };

    return {
      previousWeightLbs,
      nextWeightLbs,
      result: "recalibrated",
      reason: useWeightSignal
        ? `Recalibrated from ${previousWeightLbs} lb to ${nextWeightLbs} lb based on materially heavier sets logged.`
        : `Recalibrated from ${previousWeightLbs} lb to ${nextWeightLbs} lb because reps greatly exceeded the target at the prescribed weight.`,
      nextState
    };
  }

  private calculateRecalibrationResultV2(
    input: ProgressionComputationInputV2,
    previousWeightLbs: number
  ): ProgressionComputationResultV2 | null {
    const { exercise, outcome, state } = input;
    const loadType = resolveLoadType(exercise.loadType);

    // See calculateRecalibrationResult(): skip assistance-mode recalibration for now.
    if (loadType === "assistance") {
      return null;
    }

    const effortSignals = getSetEffortSignals(outcome.sets);
    if (effortSignals.hasNearFailure || effortSignals.hasTechnicalFailure || effortSignals.hasStoppedEarly) {
      return null;
    }

    const performanceSets = (outcome.sets ?? []).filter((set) => set.failureStatus !== "stopped_early");
    const weightQualifyingSets = performanceSets.filter((set) => isMaterialOverperformanceSet(set, loadType));
    const repQualifyingSets = performanceSets.filter(
      (set) =>
        isMaterialRepOverperformanceSet(set, exercise.incrementLbs) ||
        isRirSupportedRepOverperformanceSet(set, exercise.incrementLbs)
    );

    const useWeightSignal = weightQualifyingSets.length >= MIN_RECALIBRATION_SET_COUNT;
    const useRepSignal =
      !useWeightSignal &&
      (repQualifyingSets.length >= MIN_RECALIBRATION_SET_COUNT || repQualifyingSets.some(isExtremeRepOverperformanceSet));

    if (!useWeightSignal && !useRepSignal) {
      return null;
    }

    const qualifyingSets = useWeightSignal ? weightQualifyingSets : repQualifyingSets;
    const includesRir5Plus = qualifyingSets.some((set) => set.rir === "rir_5_plus");

    const estimatedOneRepMaxes = qualifyingSets.map((set) =>
      estimateOneRepMaxEpley(set.actualWeightLbs!, set.actualReps!)
    );
    const targetRepCounts = qualifyingSets.map((set) => set.targetReps);
    const representativeE1rm = median(estimatedOneRepMaxes);
    const representativeTargetReps = median(targetRepCounts);
    const uncappedWorkingWeight = estimateWorkingWeightFromOneRepMax(
      representativeE1rm,
      representativeTargetReps
    );
    const cappedWorkingWeight = Math.min(
      uncappedWorkingWeight,
      previousWeightLbs * MAX_RECALIBRATION_JUMP_MULTIPLIER
    );
    const nextWeightLbs = roundDownToIncrement(cappedWorkingWeight, exercise.incrementLbs);

    const tooEasyIncreaseCap = roundToTwoDecimals(2 * exercise.incrementLbs);
    if (nextWeightLbs <= previousWeightLbs + tooEasyIncreaseCap) {
      return null;
    }

    const repRangeMin = state.repRangeMin;
    const repRangeMax = state.repRangeMax;
    const previousRepGoal = state.repGoal;
    const nextRepGoal = clampInteger(previousRepGoal, repRangeMin, repRangeMax);

    const nextState: ProgressionStateSnapshotV2 = {
      currentWeightLbs: nextWeightLbs,
      lastCompletedWeightLbs: nextWeightLbs,
      consecutiveFailures: 0,
      lastEffortFeedback: outcome.effortFeedback,
      repGoal: nextRepGoal,
      repRangeMin,
      repRangeMax
    };

    return {
      previousWeightLbs,
      nextWeightLbs,
      previousRepGoal,
      nextRepGoal,
      result: "recalibrated",
      reason: useWeightSignal
        ? `Recalibrated from ${previousWeightLbs} lb to ${nextWeightLbs} lb based on materially heavier sets logged.`
        : `Recalibrated from ${previousWeightLbs} lb to ${nextWeightLbs} lb because reps greatly exceeded the target at the prescribed ${loadNoun(loadType)}${
            includesRir5Plus ? " (and you reported 5+ reps in reserve)." : "."
          }`,
      nextState
    };
  }
}
