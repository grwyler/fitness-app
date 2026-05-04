import type {
  CurrentWorkoutSessionDto,
  DashboardDto,
  ExerciseCatalogItemDto,
  ExerciseEntryDto,
  ActiveProgramDto,
  GetCurrentWorkoutSessionResponse,
  GetDashboardResponse,
  LogSetResponse,
  NextWorkoutTemplateDto,
  ProgramDto,
  ProgramPositionDto,
  ProgressMetricDto,
  ProgressionUpdateDto,
  WeightValueDto,
  WorkoutHistoryItemDto,
  WorkoutSessionDto
} from "@fitness/shared";
import type { UnitSystem } from "@fitness/shared";
import { isCustomWorkoutProgramId } from "../../domain/models/custom-workout.js";
import { generateCustomProgramDescription } from "../../domain/services/custom-program-description.js";
import type { EnrollmentRecord } from "../../repositories/models/enrollment.persistence.js";
import type { ExerciseRecord } from "../../repositories/models/exercise.persistence.js";
import type { WorkoutTemplateRecord } from "../../repositories/models/exercise.persistence.js";
import type { ProgramDefinition } from "../../repositories/models/program.persistence.js";
import type { ProgressMetricRecord } from "../../repositories/models/progress-metric.persistence.js";
import type {
  ExerciseEntryRecord,
  SetRecord,
  WorkoutHistorySummaryRecord,
  WorkoutSessionGraph
} from "../../repositories/models/workout-session.persistence.js";

function toIsoString(value: Date | null) {
  return value ? value.toISOString() : null;
}

function toWeightValueDto(value: number): WeightValueDto {
  return {
    value,
    unit: "lb"
  };
}

function mapSetDto(set: SetRecord) {
  return {
    id: set.id,
    exerciseEntryId: set.exerciseEntryId,
    setNumber: set.setNumber,
    targetReps: set.targetReps,
    actualReps: set.actualReps,
    targetWeight: toWeightValueDto(set.targetWeightLbs),
    actualWeight: set.actualWeightLbs === null ? null : toWeightValueDto(set.actualWeightLbs),
    status: set.status,
    completedAt: toIsoString(set.completedAt)
  };
}

function mapExerciseEntryDto(exerciseEntry: ExerciseEntryRecord, sets: SetRecord[]): ExerciseEntryDto {
  return {
    id: exerciseEntry.id,
    exerciseId: exerciseEntry.exerciseId,
    workoutTemplateExerciseEntryId: exerciseEntry.workoutTemplateExerciseEntryId,
    exerciseName: exerciseEntry.exerciseNameSnapshot,
    category: exerciseEntry.exerciseCategorySnapshot,
    sequenceOrder: exerciseEntry.sequenceOrder,
    targetSets: exerciseEntry.targetSets,
    targetReps: exerciseEntry.targetReps,
    repRangeMin: exerciseEntry.repRangeMin ?? exerciseEntry.targetReps,
    repRangeMax: exerciseEntry.repRangeMax ?? exerciseEntry.targetReps,
    targetWeight: toWeightValueDto(exerciseEntry.targetWeightLbs),
    restSeconds: exerciseEntry.restSeconds,
    effortFeedback: exerciseEntry.effortFeedback,
    completedAt: toIsoString(exerciseEntry.completedAt),
    sets: [...sets].sort((left, right) => left.setNumber - right.setNumber).map(mapSetDto)
  };
}

export function mapWorkoutSessionDto(graph: WorkoutSessionGraph): WorkoutSessionDto {
  const setsByExerciseEntryId = new Map<string, SetRecord[]>();

  for (const set of graph.sets) {
    const existingSets = setsByExerciseEntryId.get(set.exerciseEntryId) ?? [];
    existingSets.push(set);
    setsByExerciseEntryId.set(set.exerciseEntryId, existingSets);
  }

  return {
    id: graph.session.id,
    status: graph.session.status,
    sessionType: isCustomWorkoutProgramId(graph.session.programId) ? "custom" : "program",
    isPartial: graph.session.isPartial,
    recoveryState: graph.session.recoveryState,
    programId: graph.session.programId,
    workoutTemplateId: graph.session.workoutTemplateId,
    programName: graph.session.programNameSnapshot,
    workoutName: graph.session.workoutNameSnapshot,
    startedAt: toIsoString(graph.session.startedAt),
    completedAt: toIsoString(graph.session.completedAt),
    durationSeconds: graph.session.durationSeconds,
    exercises: [...graph.exerciseEntries]
      .sort((left, right) => left.sequenceOrder - right.sequenceOrder)
      .map((exerciseEntry) =>
        mapExerciseEntryDto(exerciseEntry, setsByExerciseEntryId.get(exerciseEntry.id) ?? [])
      )
  };
}

export function mapNextWorkoutTemplateDto(
  template: WorkoutTemplateRecord | null | undefined
): NextWorkoutTemplateDto | null {
  if (!template) {
    return null;
  }

  return {
    id: template.id,
    name: template.name,
    category: template.category ?? "Full Body",
    sequenceOrder: template.sequenceOrder,
    estimatedDurationMinutes: template.estimatedDurationMinutes
  };
}

export function mapProgramDto(definition: ProgramDefinition): ProgramDto {
  const description =
    definition.program.description && definition.program.description.trim().length > 0
      ? definition.program.description
      : definition.program.source === "custom"
        ? generateCustomProgramDescription({
            templates: definition.templates.map((template) => ({
              exercises: template.exercises.map((exercise) => ({
                targetReps: exercise.targetReps,
                exercise: {
                  name: exercise.exerciseName,
                  primaryMuscleGroup: exercise.primaryMuscleGroup,
                  movementPattern: exercise.movementPattern
                }
              }))
            }))
          })
        : null;

  return {
    id: definition.program.id,
    source: definition.program.source,
    trainingGoal: definition.program.trainingGoal,
    name: definition.program.name,
    description,
    daysPerWeek: definition.program.daysPerWeek,
    sessionDurationMinutes: definition.program.sessionDurationMinutes,
    difficultyLevel: definition.program.difficultyLevel,
    ...(definition.program.source === "predefined" ? { metadata: definition.program.metadata ?? null } : {}),
    workouts: [...definition.templates]
      .sort((left, right) => left.sequenceOrder - right.sequenceOrder)
      .map((template) => ({
        id: template.id,
        name: template.name,
        category: template.category ?? "Full Body",
        sequenceOrder: template.sequenceOrder,
        estimatedDurationMinutes: template.estimatedDurationMinutes,
        exercises: [...template.exercises]
          .sort((left, right) => left.sequenceOrder - right.sequenceOrder)
          .map((exercise) => ({
            id: exercise.id,
            exerciseId: exercise.exerciseId,
            exerciseName: exercise.exerciseName,
            category: exercise.category,
            sequenceOrder: exercise.sequenceOrder,
            targetSets: exercise.targetSets,
            targetReps: exercise.targetReps,
            ...(exercise.repRangeMin != null ? { repRangeMin: exercise.repRangeMin } : {}),
            ...(exercise.repRangeMax != null ? { repRangeMax: exercise.repRangeMax } : {}),
            restSeconds: exercise.restSeconds,
            ...(exercise.progressionStrategy != null ? { progressionStrategy: exercise.progressionStrategy } : {})
          }))
      }))
  };
}

function mapProgramPositionDto(input: {
  completedWorkoutCount: number;
  daysPerWeek: number;
}): ProgramPositionDto {
  const completedWorkoutCount = Math.max(0, Math.floor(input.completedWorkoutCount));
  const workoutNumber = completedWorkoutCount + 1;

  if (!Number.isInteger(input.daysPerWeek) || input.daysPerWeek <= 0) {
    return {
      workoutNumber,
      weekNumber: null,
      dayNumber: null,
      label: `Workout ${workoutNumber}`
    };
  }

  const weekNumber = Math.floor(completedWorkoutCount / input.daysPerWeek) + 1;
  const dayNumber = (completedWorkoutCount % input.daysPerWeek) + 1;

  return {
    workoutNumber,
    weekNumber,
    dayNumber,
    label: `Week ${weekNumber} · Day ${dayNumber}`
  };
}

export function mapActiveProgramDto(input: {
  enrollment: EnrollmentRecord;
  programDefinition: ProgramDefinition;
  nextWorkoutTemplate: WorkoutTemplateRecord | null;
  completedWorkoutCount: number;
}): ActiveProgramDto {
  return {
    enrollmentId: input.enrollment.id,
    program: mapProgramDto(input.programDefinition),
    status: input.enrollment.status,
    startedAt: input.enrollment.startedAt.toISOString(),
    completedAt: toIsoString(input.enrollment.completedAt),
    nextWorkoutTemplate: mapNextWorkoutTemplateDto(input.nextWorkoutTemplate),
    completedWorkoutCount: input.completedWorkoutCount,
    currentPosition: mapProgramPositionDto({
      completedWorkoutCount: input.completedWorkoutCount,
      daysPerWeek: input.programDefinition.program.daysPerWeek
    })
  };
}

export function mapLogSetResponse(graph: WorkoutSessionGraph, updatedSetId: string): LogSetResponse {
  const updatedSet = graph.sets.find((set) => set.id === updatedSetId);
  if (!updatedSet) {
    throw new Error(`Updated set ${updatedSetId} not found in workout session graph.`);
  }

  const exerciseEntry = graph.exerciseEntries.find((entry) => entry.id === updatedSet.exerciseEntryId);
  if (!exerciseEntry) {
    throw new Error(`Exercise entry ${updatedSet.exerciseEntryId} not found in workout session graph.`);
  }

  const siblingSets = graph.sets.filter((set) => set.exerciseEntryId === updatedSet.exerciseEntryId);

  return {
    set: mapSetDto(updatedSet),
    exerciseEntry: {
      id: exerciseEntry.id,
      completedSetCount: siblingSets.filter((set) => set.status === "completed").length,
      totalSetCount: siblingSets.length,
      hasFailures: siblingSets.some((set) => set.status === "failed"),
      isComplete: siblingSets.every((set) => set.status !== "pending")
    },
    workoutSession: {
      id: graph.session.id,
      status: graph.session.status
    }
  };
}

export function mapProgressMetricDto(record: ProgressMetricRecord): ProgressMetricDto {
  return {
    id: record.id,
    metricType: record.metricType,
    metricValue: record.metricValue,
    displayText: record.displayText,
    recordedAt: record.recordedAt.toISOString()
  };
}

export function mapExerciseCatalogItemDto(record: ExerciseRecord): ExerciseCatalogItemDto {
  return {
    id: record.id,
    name: record.name,
    category: record.category,
    movementPattern: record.movementPattern,
    primaryMuscleGroup: record.primaryMuscleGroup,
    equipmentType: record.equipmentType,
    defaultTargetSets: record.defaultTargetSets,
    defaultTargetReps: record.defaultTargetReps,
    defaultStartingWeight: toWeightValueDto(record.defaultStartingWeightLbs),
    isBodyweight: record.isBodyweight,
    isWeightOptional: record.isWeightOptional,
    isProgressionEligible: record.isProgressionEligible
  };
}

export function mapProgressionUpdateDto(input: {
  exerciseId: string;
  exerciseName: string;
  previousWeightLbs: number;
  nextWeightLbs: number;
  previousRepGoal: number;
  nextRepGoal: number;
  result: ProgressionUpdateDto["result"];
  reason: string;
  confidence: ProgressionUpdateDto["confidence"];
  reasonCodes: ProgressionUpdateDto["reasonCodes"];
  evidence: ProgressionUpdateDto["evidence"];
}): ProgressionUpdateDto {
  return {
    exerciseId: input.exerciseId,
    exerciseName: input.exerciseName,
    previousWeight: toWeightValueDto(input.previousWeightLbs),
    nextWeight: toWeightValueDto(input.nextWeightLbs),
    previousRepGoal: input.previousRepGoal,
    nextRepGoal: input.nextRepGoal,
    result: input.result,
    reason: input.reason,
    confidence: input.confidence,
    reasonCodes: input.reasonCodes,
    evidence: input.evidence
  };
}

export function mapWorkoutHistoryItemDto(input: {
  history: WorkoutHistorySummaryRecord;
  progressMetrics: ProgressMetricRecord[];
}): WorkoutHistoryItemDto {
  return {
    id: input.history.id,
    workoutName: input.history.workoutName,
    programName: input.history.programName,
    status: input.history.status,
    isPartial: input.history.isPartial,
    startedAt: toIsoString(input.history.startedAt),
    completedAt: toIsoString(input.history.completedAt),
    durationSeconds: input.history.durationSeconds,
    exerciseCount: input.history.exerciseCount,
    plannedSetCount: input.history.plannedSetCount,
    completedSetCount: input.history.completedSetCount,
    failedSetCount: input.history.failedSetCount,
    highlights: input.progressMetrics.map((progressMetric) => progressMetric.displayText)
  };
}

export function mapCurrentWorkoutSessionDto(
  graph: WorkoutSessionGraph | null
): GetCurrentWorkoutSessionResponse {
  const response: CurrentWorkoutSessionDto = {
    activeWorkoutSession: graph ? mapWorkoutSessionDto(graph) : null
  };

  return response;
}

export function mapDashboardDto(input: {
  activeProgram: ActiveProgramDto | null;
  activeWorkoutSessionGraph: WorkoutSessionGraph | null;
  nextWorkoutTemplate: WorkoutTemplateRecord | null;
  recentProgressMetrics: ProgressMetricRecord[];
  recentWorkoutHistory: WorkoutHistorySummaryRecord[];
  weeklyWorkoutCount: number;
  userUnitSystem: UnitSystem;
}): GetDashboardResponse {
  const progressMetricsBySessionId = new Map<string, ProgressMetricRecord[]>();

  for (const progressMetric of input.recentProgressMetrics) {
    if (!progressMetric.workoutSessionId) {
      continue;
    }

    const existingMetrics = progressMetricsBySessionId.get(progressMetric.workoutSessionId) ?? [];
    existingMetrics.push(progressMetric);
    progressMetricsBySessionId.set(progressMetric.workoutSessionId, existingMetrics);
  }

  const response: DashboardDto = {
    activeProgram: input.activeProgram,
    activeWorkoutSession: input.activeWorkoutSessionGraph
      ? mapWorkoutSessionDto(input.activeWorkoutSessionGraph)
      : null,
    nextWorkoutTemplate: mapNextWorkoutTemplateDto(input.nextWorkoutTemplate),
    recentProgressMetrics: input.recentProgressMetrics.map(mapProgressMetricDto),
    recentWorkoutHistory: input.recentWorkoutHistory.map((historyItem) =>
      mapWorkoutHistoryItemDto({
        history: historyItem,
        progressMetrics: progressMetricsBySessionId.get(historyItem.id) ?? []
      })
    ),
    weeklyWorkoutCount: input.weeklyWorkoutCount,
    userUnitSystem: input.userUnitSystem
  };

  return response;
}
