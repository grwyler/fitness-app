import type { ExerciseCategory } from "../domain/enums.js";

export type CustomWorkoutNamingExercise = {
  name: string;
  primaryMuscleGroup?: string | null;
  movementPattern?: string | null;
  category?: ExerciseCategory | null;
};

type WorkoutBucket = "push" | "pull" | "legs" | "core" | "unknown";

function normalizeWhitespace(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function normalizeExerciseKey(name: string) {
  return normalizeWhitespace(name).toLowerCase();
}

function truncateTitlePart(value: string, maxLength: number) {
  const normalized = normalizeWhitespace(value);
  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, Math.max(0, maxLength - 3)).trim()}...`;
}

function bucketForExercise(exercise: CustomWorkoutNamingExercise): WorkoutBucket {
  const primary = exercise.primaryMuscleGroup?.toLowerCase() ?? "";
  const pattern = exercise.movementPattern?.toLowerCase() ?? "";

  if (pattern === "core" || primary === "core" || primary.includes("ab")) {
    return "core";
  }

  if (["quads", "hamstrings", "glutes", "calves"].includes(primary)) {
    return "legs";
  }

  if (primary === "posterior_chain") {
    return "legs";
  }

  if (["chest", "shoulders", "triceps"].includes(primary) || pattern === "push") {
    return "push";
  }

  if (["back", "lats", "biceps", "upper_back"].includes(primary) || pattern === "pull") {
    return "pull";
  }

  if (pattern === "squat" || pattern === "lunge") {
    return "legs";
  }

  return "unknown";
}

function pickBucketTitle(bucket: WorkoutBucket) {
  switch (bucket) {
    case "push":
      return "Push Workout";
    case "pull":
      return "Pull Workout";
    case "legs":
      return "Leg Day";
    case "core":
      return "Core Workout";
    default:
      return null;
  }
}

function computeCategoryBasedTitle(exercises: CustomWorkoutNamingExercise[]) {
  const counts: Record<WorkoutBucket, number> = {
    push: 0,
    pull: 0,
    legs: 0,
    core: 0,
    unknown: 0
  };

  for (const exercise of exercises) {
    counts[bucketForExercise(exercise)]++;
  }

  const knownCount = counts.push + counts.pull + counts.legs + counts.core;
  if (knownCount === 0) {
    return null;
  }

  const total = exercises.length;
  const dominant = (Object.entries(counts) as Array<[WorkoutBucket, number]>)
    .filter(([bucket]) => bucket !== "unknown")
    .sort((left, right) => right[1] - left[1])[0];

  const [dominantBucket, dominantCount] = dominant ?? ["unknown", 0];
  if (dominantBucket !== "unknown" && dominantCount / total >= 0.6) {
    return pickBucketTitle(dominantBucket);
  }

  const hasLegs = counts.legs > 0;
  const hasCore = counts.core > 0;
  const hasUpper = counts.push + counts.pull > 0;

  if (hasUpper && !hasLegs && !hasCore) {
    return "Upper Body Workout";
  }

  if (hasUpper && hasLegs) {
    return "Full Body Workout";
  }

  if (hasLegs && !hasUpper) {
    return "Leg Day";
  }

  if (hasCore && !hasUpper && !hasLegs) {
    return "Core Workout";
  }

  if (hasCore && (hasUpper || hasLegs)) {
    return "Full Body Workout";
  }

  return null;
}

function buildNameListFallback(exercises: CustomWorkoutNamingExercise[]) {
  const uniqueNames = exercises.map((exercise) => exercise.name);
  const first = truncateTitlePart(uniqueNames[0] ?? "Workout", 24);
  const second = truncateTitlePart(uniqueNames[1] ?? "Workout", 24);

  if (uniqueNames.length === 1) {
    return `${first} Workout`;
  }

  if (uniqueNames.length === 2) {
    return truncateTitlePart(`${first} + ${second}`, 48);
  }

  const remaining = Math.max(0, uniqueNames.length - 2);
  const base = `${first} + ${second}${remaining > 0 ? ` + ${remaining} more` : ""}`;
  return truncateTitlePart(base, 52);
}

export function generateCustomWorkoutNameFromExercises(
  exercises: CustomWorkoutNamingExercise[]
): string | null {
  const uniqueExercises: CustomWorkoutNamingExercise[] = [];
  const seen = new Set<string>();

  for (const exercise of exercises) {
    const key = normalizeExerciseKey(exercise.name);
    if (!key || seen.has(key)) {
      continue;
    }
    seen.add(key);
    uniqueExercises.push({
      ...exercise,
      name: normalizeWhitespace(exercise.name)
    });
  }

  if (uniqueExercises.length === 0) {
    return null;
  }

  if (uniqueExercises.length === 1) {
    const base = truncateTitlePart(uniqueExercises[0]!.name, 32);
    return `${base} Workout`;
  }

  if (uniqueExercises.length === 2) {
    const first = truncateTitlePart(uniqueExercises[0]!.name, 24);
    const second = truncateTitlePart(uniqueExercises[1]!.name, 24);
    return truncateTitlePart(`${first} + ${second}`, 52);
  }

  const categoryTitle = computeCategoryBasedTitle(uniqueExercises);
  if (categoryTitle) {
    return categoryTitle;
  }

  return buildNameListFallback(uniqueExercises);
}
