import { formatWeightForUser, type CompleteWorkoutSessionResponse, type UnitSystem, type WorkoutSessionDto } from "@fitness/shared";

export type WorkoutSummaryStats = {
  completedExerciseCount: number;
  completedSetCount: number;
  exerciseCount: number;
  failedSetCount: number;
  plannedSetCount: number;
  totalVolume: number;
  durationMinutes: number | null;
};

export type WorkoutSummaryOutcome = {
  label: string;
  value: string;
  detail: string;
};

export type UnusualProgressionReviewItem = {
  exerciseId: string;
  exerciseName: string;
  title: string;
  message: string;
  evidence: string[];
};

function resolveUnitSystem(unitSystem: UnitSystem | undefined) {
  return unitSystem ?? "imperial";
}

function formatWeightText(
  weightLbs: number,
  unitSystem: UnitSystem | undefined,
  options?: { maximumFractionDigits?: number; useGrouping?: boolean }
) {
  return formatWeightForUser({
    weightLbs,
    unitSystem: resolveUnitSystem(unitSystem),
    maximumFractionDigits: options?.maximumFractionDigits,
    useGrouping: options?.useGrouping
  }).text;
}

function formatDeltaWeightText(deltaLbs: number, unitSystem: UnitSystem | undefined) {
  const resolved = resolveUnitSystem(unitSystem);
  const unit = resolved === "metric" ? "kg" : "lb";
  const numeric = formatWeightForUser({
    weightLbs: Math.abs(deltaLbs),
    unitSystem: resolved,
    includeUnit: false,
    maximumFractionDigits: resolved === "metric" ? 1 : 2
  }).text;
  const sign = deltaLbs > 0 ? "+" : deltaLbs < 0 ? "-" : "";
  return `${sign}${numeric} ${unit}`;
}

function lowerCaseFirstLetter(value: string) {
  if (!value) {
    return value;
  }
  return value.slice(0, 1).toLowerCase() + value.slice(1);
}

function safeIncludes(list: string[] | null | undefined, value: string) {
  return Array.isArray(list) && list.includes(value);
}

export function isRepOverperformanceProgressionUpdate(update: CompleteWorkoutSessionResponse["progressionUpdates"][number]) {
  return safeIncludes(update.reasonCodes, "REPS_GREATLY_EXCEEDED_TARGET");
}

function formatRatio(value: number) {
  if (!Number.isFinite(value) || value <= 0) {
    return null;
  }

  if (value >= 10) {
    return `${Math.round(value)}×`;
  }

  return `${Math.round(value * 10) / 10}×`;
}

function buildRepOverperformanceEvidenceLines(input: {
  workout: WorkoutSessionDto;
  update: CompleteWorkoutSessionResponse["progressionUpdates"][number];
  unitSystem?: UnitSystem;
}) {
  const exercise = input.workout.exercises.find((candidate) => candidate.exerciseId === input.update.exerciseId) ?? null;
  if (!exercise) {
    return [];
  }

  const targetReps = exercise.targetReps;
  const targetWeightText = formatWeightText(exercise.targetWeight.value, input.unitSystem, { maximumFractionDigits: 1 });
  const completedSets = exercise.sets.filter((set) => set.status === "completed" || set.status === "failed");
  const bestSet = [...completedSets].sort((left, right) => (right.actualReps ?? 0) - (left.actualReps ?? 0))[0] ?? null;

  const bestReps = bestSet?.actualReps ?? null;
  const bestWeight = bestSet?.actualWeight?.value ?? bestSet?.targetWeight.value ?? null;
  const bestWeightText = bestWeight == null ? null : formatWeightText(bestWeight, input.unitSystem, { maximumFractionDigits: 1 });

  const ratio = bestReps && targetReps > 0 ? bestReps / targetReps : null;
  const ratioText = ratio ? formatRatio(ratio) : null;

  const lines: string[] = [];
  lines.push(`Prescribed: ${targetReps} reps at ${targetWeightText}`);
  if (bestReps != null && bestWeightText) {
    lines.push(`Logged best: ${bestReps} reps at ${bestWeightText}`);
  } else if (bestReps != null) {
    lines.push(`Logged best: ${bestReps} reps`);
  }
  if (ratioText) {
    lines.push(`That's ${ratioText} the target reps`);
  }

  const nextWeightText = formatWeightText(input.update.nextWeight.value, input.unitSystem, { maximumFractionDigits: 1 });
  lines.push(`Next time: ${nextWeightText}`);

  return lines.filter(Boolean);
}

export function getUnusualProgressionReviewItems(
  summary: CompleteWorkoutSessionResponse,
  unitSystem?: UnitSystem
): UnusualProgressionReviewItem[] {
  const repOverperformanceItems = summary.progressionUpdates
    .filter(isRepOverperformanceProgressionUpdate)
    .map((update) => ({
      exerciseId: update.exerciseId,
      exerciseName: update.exerciseName,
      title: "Unusual performance detected",
      message:
        "You completed far more reps than prescribed. This usually means the weight is too light, the starting point needs recalibration, or the log may need review. The recommendation is cautious because this is a large mismatch.",
      evidence: buildRepOverperformanceEvidenceLines({ workout: summary.workoutSession, update, unitSystem })
    }));

  return repOverperformanceItems;
}

export function getWorkoutSummaryStats(workout: WorkoutSessionDto): WorkoutSummaryStats {
  const sets = workout.exercises.flatMap((exercise) => exercise.sets);
  const completedSets = sets.filter((set) => set.status === "completed");
  const failedSets = sets.filter((set) => set.status === "failed");
  const totalVolume = sets.reduce((sum, set) => {
    if (set.status !== "completed" && set.status !== "failed") {
      return sum;
    }

    const reps = set.actualReps ?? 0;
    const weight = set.actualWeight?.value ?? set.targetWeight.value;
    return sum + reps * weight;
  }, 0);

  return {
    completedExerciseCount: workout.exercises.filter((exercise) =>
      exercise.sets.length > 0 && exercise.sets.every((set) => set.status !== "pending")
    ).length,
    completedSetCount: completedSets.length,
    exerciseCount: workout.exercises.length,
    failedSetCount: failedSets.length,
    plannedSetCount: sets.length,
    totalVolume,
    durationMinutes: workout.durationSeconds ? Math.max(1, Math.round(workout.durationSeconds / 60)) : null
  };
}

export function getWorkoutSummaryHeadline(summary: CompleteWorkoutSessionResponse) {
  const recalibratedUpdates = summary.progressionUpdates.filter((update) => update.result === "recalibrated");
  const updates = summary.progressionUpdates.filter((update) => update.result === "increased");

  if (recalibratedUpdates.length > 0) {
    return `${recalibratedUpdates.length} lift${recalibratedUpdates.length === 1 ? "" : "s"} recalibrated`;
  }

  if (updates.length > 0) {
    return `${updates.length} lift${updates.length === 1 ? "" : "s"} moving up next time`;
  }

  if (summary.workoutSession.isPartial) {
    return "Workout saved";
  }

  return "Nice work. Workout saved.";
}

export function getWorkoutSummaryEncouragement(summary: CompleteWorkoutSessionResponse, unitSystem?: UnitSystem) {
  const recalibratedUpdates = summary.progressionUpdates.filter((update) => update.result === "recalibrated");
  const increasedUpdates = summary.progressionUpdates.filter((update) => update.result === "increased");

  if (recalibratedUpdates.length > 0) {
    const firstUpdate = recalibratedUpdates[0];
    if (firstUpdate) {
      return `Adjusted ${firstUpdate.exerciseName} to ${formatWeightText(firstUpdate.nextWeight.value, unitSystem)} based on your performance.`;
    }
  }

  if (increasedUpdates.length > 0) {
    const firstUpdate = increasedUpdates[0];
    if (firstUpdate) {
      return `${firstUpdate.exerciseName} moves to ${formatWeightText(firstUpdate.nextWeight.value, unitSystem)} next time.`;
    }
  }

  const metricText = summary.progressMetrics.find((metric) => metric.displayText)?.displayText;
  if (metricText) {
    return metricText;
  }

  if (summary.workoutSession.isPartial) {
    return "Saved. You still showed up and logged the work.";
  }

  return "That one is in the books.";
}

export function getProgressionUpdateSummaryText(
  update: CompleteWorkoutSessionResponse["progressionUpdates"][number],
  unitSystem?: UnitSystem
) {
  if (update.result === "skipped") {
    return "No progression update";
  }

  const previousWeight = update.previousWeight.value;
  const nextWeight = update.nextWeight.value;
  const delta = nextWeight - previousWeight;

  if (update.result === "reduced") {
    return "Reduce weight";
  }

  if (update.result === "increased" && delta > 0) {
    return `${formatDeltaWeightText(delta, unitSystem)} next time`;
  }

  if (update.result === "recalibrated" && delta > 0) {
    return `Adjusted to ${formatWeightText(nextWeight, unitSystem)} next time`;
  }

  if (delta === 0 && update.nextRepGoal != null && update.previousRepGoal != null && update.nextRepGoal > update.previousRepGoal) {
    return `Increase reps from ${update.previousRepGoal} to ${update.nextRepGoal}`;
  }

  if (update.result === "repeated") {
    return "Repeat same weight and reps";
  }

  return `Stays at ${formatWeightText(nextWeight, unitSystem)} next time`;
}

export function getProgressionUpdateResultLabel(result: CompleteWorkoutSessionResponse["progressionUpdates"][number]["result"]) {
  switch (result) {
    case "increased":
      return "Increased";
    case "repeated":
      return "Repeated";
    case "reduced":
      return "Reduced";
    case "recalibrated":
      return "Recalibrated";
    case "skipped":
      return "Skipped";
    default: {
      const exhaustiveCheck: never = result;
      return exhaustiveCheck;
    }
  }
}

export function getProgressionUpdateWeightChangeText(
  update: CompleteWorkoutSessionResponse["progressionUpdates"][number],
  unitSystem?: UnitSystem
) {
  return `${formatWeightText(update.previousWeight.value, unitSystem)} → ${formatWeightText(
    update.nextWeight.value,
    unitSystem
  )}`;
}

export function getProgressionUpdateRepGoalChangeText(update: CompleteWorkoutSessionResponse["progressionUpdates"][number]) {
  if (update.previousRepGoal == null || update.nextRepGoal == null) {
    return null;
  }

  return `${update.previousRepGoal} → ${update.nextRepGoal}`;
}

export function getProgressionUpdateReasonText(update: CompleteWorkoutSessionResponse["progressionUpdates"][number]) {
  const reason = update.reason.trim();

  if (update.result !== "skipped") {
    return reason;
  }

  if (!reason) {
    return "Progression skipped.";
  }

  if (reason.toLowerCase().startsWith("progression skipped")) {
    return reason;
  }

  if (reason.toLowerCase().startsWith("because")) {
    return `Progression skipped ${reason}`;
  }

  return `Progression skipped because ${lowerCaseFirstLetter(reason)}`;
}

export function getProgressionUpdateConfidenceLabel(
  confidence: CompleteWorkoutSessionResponse["progressionUpdates"][number]["confidence"]
) {
  switch (confidence) {
    case "high":
      return "High confidence";
    case "medium":
      return "Medium confidence";
    case "low":
      return "Low confidence";
    default: {
      const exhaustiveCheck: never = confidence;
      return exhaustiveCheck;
    }
  }
}

export function getProgressionUpdateConfidenceDisplay(input: {
  update: CompleteWorkoutSessionResponse["progressionUpdates"][number];
}) {
  if (isRepOverperformanceProgressionUpdate(input.update) && input.update.confidence === "medium") {
    return "Cautious";
  }

  return getProgressionUpdateConfidenceLabel(input.update.confidence);
}

export function getProgressionUpdateEvidence(update: CompleteWorkoutSessionResponse["progressionUpdates"][number]) {
  return update.evidence ?? [];
}

export function getWorkoutSummaryOutcomes(
  summary: CompleteWorkoutSessionResponse,
  unitSystem?: UnitSystem
): WorkoutSummaryOutcome[] {
  const stats = getWorkoutSummaryStats(summary.workoutSession);
  const recalibratedUpdates = summary.progressionUpdates.filter((update) => update.result === "recalibrated");
  const increasedUpdates = summary.progressionUpdates.filter((update) => update.result === "increased");
  const outcomes: WorkoutSummaryOutcome[] = [
    {
      label: "Exercises",
      value: `${stats.completedExerciseCount}/${stats.exerciseCount}`,
      detail: "completed"
    },
    {
      label: "Sets",
      value: `${stats.completedSetCount}/${stats.plannedSetCount}`,
      detail: stats.failedSetCount > 0 ? `${stats.failedSetCount} missed` : "logged"
    },
    {
      label: "Volume",
      value: formatWeightText(stats.totalVolume, unitSystem, { maximumFractionDigits: 0, useGrouping: true }),
      detail: "total work"
    }
  ];

  if (recalibratedUpdates.length > 0) {
    outcomes.push({
      label: "Progress",
      value: `${recalibratedUpdates.length}`,
      detail: `lift${recalibratedUpdates.length === 1 ? "" : "s"} recalibrated`
    });
  } else if (increasedUpdates.length > 0) {
    outcomes.push({
      label: "Progress",
      value: `${increasedUpdates.length}`,
      detail: `lift${increasedUpdates.length === 1 ? "" : "s"} moving up`
    });
  } else if (stats.durationMinutes) {
    outcomes.push({
      label: "Time",
      value: `${stats.durationMinutes} min`,
      detail: "training time"
    });
  }

  return outcomes;
}
