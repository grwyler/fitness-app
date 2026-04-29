type ExerciseMeta = {
  name: string;
  primaryMuscleGroup: string | null;
  movementPattern: string | null;
};

type TemplateExercise = {
  targetReps: number;
  exercise: ExerciseMeta;
};

type Template = {
  exercises: TemplateExercise[];
};

type Bucket = "push" | "pull" | "legs" | "core" | "unknown";

function normalizeWhitespace(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function truncate(value: string, maxLength: number) {
  const normalized = normalizeWhitespace(value);
  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, Math.max(0, maxLength - 3)).trim()}...`;
}

function bucketForExercise(meta: ExerciseMeta): Bucket {
  const primary = meta.primaryMuscleGroup?.toLowerCase() ?? "";
  const pattern = meta.movementPattern?.toLowerCase() ?? "";

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

function titleForBucket(bucket: Bucket) {
  switch (bucket) {
    case "push":
      return "push";
    case "pull":
      return "pull";
    case "legs":
      return "legs";
    case "core":
      return "core";
    default:
      return null;
  }
}

function muscleLabel(primaryMuscleGroup: string | null) {
  const value = primaryMuscleGroup?.toLowerCase() ?? "";

  if (["chest", "back", "shoulders", "triceps", "biceps", "core"].includes(value)) {
    return value;
  }

  if (["quads", "hamstrings", "glutes", "calves", "posterior_chain"].includes(value)) {
    return "legs";
  }

  if (value === "lats" || value === "upper_back") {
    return "back";
  }

  if (!value) {
    return null;
  }

  return null;
}

function joinNatural(items: string[]) {
  if (items.length === 0) {
    return "";
  }
  if (items.length === 1) {
    return items[0]!;
  }
  if (items.length === 2) {
    return `${items[0]} and ${items[1]}`;
  }

  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

function computeTrainingFocus(templates: Template[]) {
  const reps: number[] = [];
  for (const template of templates) {
    for (const exercise of template.exercises) {
      if (Number.isFinite(exercise.targetReps) && exercise.targetReps > 0) {
        reps.push(exercise.targetReps);
      }
    }
  }

  if (reps.length === 0) {
    return null;
  }

  const avg = reps.reduce((sum, value) => sum + value, 0) / reps.length;
  if (avg <= 6) {
    return "strength";
  }
  if (avg >= 10) {
    return "hypertrophy";
  }
  return "strength and hypertrophy";
}

function computeDominantBuckets(templates: Template[]) {
  const counts: Record<Bucket, number> = {
    push: 0,
    pull: 0,
    legs: 0,
    core: 0,
    unknown: 0
  };

  for (const template of templates) {
    for (const entry of template.exercises) {
      counts[bucketForExercise(entry.exercise)]++;
    }
  }

  const total = Object.values(counts).reduce((sum, value) => sum + value, 0);
  if (total === 0) {
    return { total: 0, counts };
  }

  return { total, counts };
}

export function generateCustomProgramDescription(input: {
  templates: Template[];
}): string {
  const workoutCount = input.templates.length;
  const exercises = input.templates.flatMap((template) => template.exercises);
  if (workoutCount === 0 || exercises.length === 0) {
    return "Custom program.";
  }

  const focus = computeTrainingFocus(input.templates);
  const { total, counts } = computeDominantBuckets(input.templates);
  const bucketTitles = (Object.entries(counts) as Array<[Bucket, number]>)
    .filter(([bucket, count]) => bucket !== "unknown" && count > 0)
    .sort((left, right) => right[1] - left[1])
    .map(([bucket]) => titleForBucket(bucket))
    .filter(Boolean) as string[];

  const dominantBucket = (Object.entries(counts) as Array<[Bucket, number]>)
    .filter(([bucket]) => bucket !== "unknown")
    .sort((left, right) => right[1] - left[1])[0];
  const dominantBucketTitle =
    total > 0 && dominantBucket && dominantBucket[1] / total >= 0.6
      ? titleForBucket(dominantBucket[0])
      : null;

  const muscleCounts = new Map<string, number>();
  for (const entry of exercises) {
    const label = muscleLabel(entry.exercise.primaryMuscleGroup);
    if (!label) {
      continue;
    }
    muscleCounts.set(label, (muscleCounts.get(label) ?? 0) + 1);
  }

  const topMuscles = [...muscleCounts.entries()]
    .sort((left, right) => right[1] - left[1])
    .map(([label]) => label)
    .slice(0, 4);

  const isSingleWorkout = workoutCount === 1;
  const workoutPrefix = isSingleWorkout ? "Custom workout" : `${workoutCount}-workout custom program`;
  const focusSuffix = focus ? ` focused on ${focus}` : null;

  if (dominantBucketTitle) {
    const musclePhrase =
      topMuscles.length > 0 ? ` with ${joinNatural(topMuscles)} work` : null;
    const focusLabel = `${dominantBucketTitle.toUpperCase().slice(0, 1)}${dominantBucketTitle.slice(1)}-focused`;
    const sentence = `${focusLabel} ${isSingleWorkout ? "workout" : "program"}${focusSuffix ? focusSuffix : ""}${
      musclePhrase ? musclePhrase : ""
    }.`;
    return truncate(sentence.replace(/\s+\./g, "."), 160);
  }

  if (bucketTitles.length >= 2 && bucketTitles.length <= 3) {
    const sentence = `${workoutPrefix}${focusSuffix ? focusSuffix : ""} covering ${bucketTitles.join(", ")}.`;
    return truncate(sentence, 160);
  }

  if (topMuscles.length > 0) {
    const sentence = `${workoutPrefix}${focusSuffix ? focusSuffix : ""} including ${joinNatural(topMuscles)}.`;
    return truncate(sentence, 160);
  }

  return truncate(`${workoutPrefix}${focusSuffix ? focusSuffix : ""}.`, 160);
}
