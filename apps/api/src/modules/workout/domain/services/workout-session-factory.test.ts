import assert from "node:assert/strict";
import type { WorkoutTemplateDefinition } from "../../repositories/models/exercise.persistence.js";
import type { ProgressionStateV2Record } from "../../repositories/models/progression-state-v2.persistence.js";
import { ProgressionEngine } from "./progression-engine.js";
import { WorkoutSessionFactory } from "./workout-session-factory.js";
import { resolveExerciseProgrammingProfile } from "./exercise-programming-profile.js";
import type { DomainTestCase } from "../test-helpers/test-case.js";

const definition: WorkoutTemplateDefinition = {
  template: { id: "template", programId: "program", programName: "Program", name: "Day A", sequenceOrder: 1, estimatedDurationMinutes: 45, isActive: true, createdAt: new Date(), updatedAt: new Date() },
  exercises: [{
    exercise: { id: "exercise", name: "Bench Press", category: "compound", movementPattern: "push", primaryMuscleGroup: "chest", equipmentType: "barbell", defaultTargetSets: 3, defaultTargetReps: 8, defaultStartingWeightLbs: 0, defaultIncrementLbs: 5, isBodyweight: false, isWeightOptional: false, isProgressionEligible: true, loggingModality: "reps_load", isActive: true, createdAt: new Date(), updatedAt: new Date() },
    templateExercise: { id: "entry", workoutTemplateId: "template", exerciseId: "exercise", sequenceOrder: 1, targetSets: 3, targetReps: 8, repRangeMin: 8, repRangeMax: 12, restSeconds: 120, progressionStrategy: "double_progression", setScheme: "straight", createdAt: new Date(), updatedAt: new Date() }
  }]
};
const state: ProgressionStateV2Record = { id: "state", userId: "user", workoutTemplateExerciseEntryId: "entry", currentWeightLbs: 0, lastCompletedWeightLbs: null, repGoal: 8, repRangeMin: 8, repRangeMax: 12, consecutiveFailures: 0, lastEffortFeedback: null, lastPerformedAt: null, createdAt: new Date(), updatedAt: new Date() };
const engine = new ProgressionEngine();
const context = { exerciseName: "Bench Press", exerciseCategory: "compound" as const, incrementLbs: 5, isBodyweight: false, isWeightOptional: false, loadType: "external" as const };
const history = (actualReps: Array<number>, status: "completed" | "failed" = "completed") => ({
  workoutTemplateExerciseEntryId: "entry",
  sets: actualReps.map((reps, index) => ({ setNumber: index + 1, setType: "working" as const, targetReps: 8, actualReps: reps, targetWeightLbs: 100, actualWeightLbs: 100, status, failureStatus: null, tiers: null as import("@fitness/shared").WorkoutSetTierDto[] | null }))
});

export const workoutSessionFactoryTestCases: DomainTestCase[] = [
  { name: "exercise characteristics select distinct sensible rep-range profiles", run: () => {
    const profile = (input: Parameters<typeof resolveExerciseProgrammingProfile>[0]) => resolveExerciseProgrammingProfile(input);
    assert.deepEqual([profile({ category: "compound", movementPattern: "hinge", equipmentType: "barbell", primaryMuscleGroup: "hamstrings" }).repRangeMin, profile({ category: "compound", movementPattern: "push", equipmentType: "barbell", primaryMuscleGroup: "chest" }).repRangeMin, profile({ category: "compound", movementPattern: "pull", equipmentType: "machine", primaryMuscleGroup: "back" }).repRangeMin, profile({ category: "accessory", movementPattern: "raise", equipmentType: "dumbbell", primaryMuscleGroup: "shoulders" }).repRangeMin, profile({ category: "accessory", movementPattern: "raise", equipmentType: "machine", primaryMuscleGroup: "calves" }).repRangeMin], [5, 6, 8, 10, 12]);
    assert.equal(profile({ category: "compound", movementPattern: "hinge", equipmentType: "barbell", primaryMuscleGroup: "hamstrings" }).repRangeMax, 8);
    assert.equal(profile({ category: "accessory", movementPattern: "raise", equipmentType: "machine", primaryMuscleGroup: "calves" }).repRangeMax, 20);
  } },
  { name: "canonical prescription seeds zero state from successful history and adds one rep", run: () => {
    const targets = engine.generatePrescription({ state, exercise: context, loggingModality: "reps_load", strategy: "double_progression", setScheme: "straight", targetSets: 3, history: history([8, 8, 8]) });
    assert.deepEqual(targets.map((set) => [set.targetWeightLbs, set.targetReps]), [[100, 9], [100, 9], [100, 9]]);
  } },
  { name: "history beyond the planned rep target adds one rep without a premature load jump", run: () => {
    const ceilingHistory = history([12, 12, 12]);
    ceilingHistory.sets.forEach((set) => { set.targetReps = 12; });
    const ceilingState = { ...state, repGoal: 12, repRangeMin: 8, repRangeMax: 12 };
    const targets = engine.generatePrescription({ state: ceilingState, exercise: context, loggingModality: "reps_load", strategy: "double_progression", setScheme: "straight", targetSets: 3, history: ceilingHistory });
    assert.deepEqual(targets.map((set) => [set.targetWeightLbs, set.targetReps]), [[100, 8], [100, 8], [100, 8]]);
  } },
  { name: "failed prior history is not converted into a progressed seed", run: () => {
    const failedHistory = history([5, 6, 5], "failed");
    const targets = engine.generatePrescription({ state, exercise: context, loggingModality: "reps_load", strategy: "double_progression", setScheme: "straight", targetSets: 3, history: failedHistory });
    assert.ok(targets.every((set) => set.targetWeightLbs === 100 && set.targetReps === 8));
  } },
  { name: "incomplete failed history falls back through plan and prior successful loads", run: () => {
    const failed = { workoutTemplateExerciseEntryId: "entry", sets: [
      { setNumber: 1, setType: "working" as const, targetReps: 8, actualReps: 4, targetWeightLbs: null, actualWeightLbs: null, status: "failed" as const, failureStatus: null }
    ], previousSuccessfulSets: [
      { setNumber: 1, setType: "working" as const, targetReps: 8, actualReps: 8, targetWeightLbs: 95, actualWeightLbs: 100, status: "completed" as const, failureStatus: null }
    ] };
    const fromPriorSuccess = engine.generatePrescription({ state, exercise: context, loggingModality: "reps_load", strategy: "double_progression", setScheme: "straight", targetSets: 3, history: failed });
    const fromPlan = engine.generatePrescription({ state, exercise: context, loggingModality: "reps_load", strategy: "double_progression", setScheme: "straight", targetSets: 3, planTargetWeightLbs: 105, history: { ...failed, previousSuccessfulSets: [] } });
    assert.ok(fromPriorSuccess.every((set) => set.targetWeightLbs === 100));
    assert.ok(fromPlan.every((set) => set.targetWeightLbs === 105));
    assert.ok(fromPriorSuccess.every((set) => set.targetWeightLbs !== 0));
  } },
  { name: "failed history with no usable load falls back to the exercise default, never an accidental zero", run: () => {
    const failed = { workoutTemplateExerciseEntryId: "entry", sets: [
      { setNumber: 1, setType: "working" as const, targetReps: 8, actualReps: 3, targetWeightLbs: null, actualWeightLbs: null, status: "failed" as const, failureStatus: null }
    ] };
    const targets = engine.generatePrescription({ state, exercise: context, loggingModality: "reps_load", strategy: "double_progression", setScheme: "straight", targetSets: 2, defaultStartingWeightLbs: 95, history: failed });
    assert.deepEqual(targets.map((set) => set.targetWeightLbs), [95, 95]);
    assert.ok(targets.every((set) => set.targetWeightLbs !== 0));
  } },
  { name: "zero is accepted only for an explicitly no-load movement", run: () => {
    const noLoad = engine.generatePrescription({ state, exercise: { ...context, isBodyweight: true }, loggingModality: "reps_load", strategy: "double_progression", setScheme: "straight", targetSets: 1 });
    const loadedUnknown = engine.generatePrescription({ state, exercise: context, loggingModality: "reps_load", strategy: "double_progression", setScheme: "straight", targetSets: 1 });
    assert.equal(noLoad[0]?.targetWeightLbs, 0);
    assert.equal(loadedUnknown[0]?.targetWeightLbs, null);
  } },
  { name: "saved state wins over older history in the canonical engine", run: () => {
    const targets = engine.generatePrescription({ state: { ...state, currentWeightLbs: 110, repGoal: 9, lastPerformedAt: new Date() }, exercise: context, loggingModality: "reps_load", strategy: "double_progression", setScheme: "straight", targetSets: 3, history: history([12, 12, 12]) });
    assert.ok(targets.every((set) => set.targetWeightLbs === 110 && set.targetReps === 9));
  } },
  { name: "ascending and reverse pyramids keep coherent per-set targets", run: () => {
    const make = (setScheme: "ascending_pyramid" | "reverse_pyramid") => engine.generatePrescription({ state: { ...state, currentWeightLbs: 100, repGoal: 10, repRangeMin: 6 }, exercise: context, loggingModality: "reps_load", strategy: "double_progression", setScheme, targetSets: 3 }).map((set) => [set.targetWeightLbs, set.targetReps]);
    assert.deepEqual(make("ascending_pyramid"), [[100, 10], [105, 9], [110, 8]]);
    assert.deepEqual(make("reverse_pyramid"), [[110, 10], [105, 11], [100, 12]]);
  } },
  { name: "factory only materializes the canonical prescription and preserves historical snapshots", run: () => {
    const generated = engine.generatePrescription({ state: { ...state, currentWeightLbs: 100 }, exercise: context, loggingModality: "reps_load", strategy: "double_progression", setScheme: "ascending_pyramid", targetSets: 3 });
    const graph = new WorkoutSessionFactory().build({ userId: "user", programId: "program", programName: "Program", workoutTemplateDefinition: definition, progressionStatesV2: [{ ...state, currentWeightLbs: 100 }], prescribedTargetsByTemplateEntryId: new Map([["entry", generated]]), startedAt: new Date() });
    assert.deepEqual(graph.sets.map((set) => [set.targetWeightLbs, set.targetReps]), generated.map((set) => [set.targetWeightLbs, set.targetReps]));
    assert.ok(graph.sets.every((set) => set.originalTargetWeightLbs === undefined));
  } },
  { name: "factory rejects progression-eligible entries without canonical targets", run: () => {
    assert.throws(() => new WorkoutSessionFactory().build({ userId: "user", programId: "program", programName: "Program", workoutTemplateDefinition: definition, progressionStatesV2: [state], prescribedTargetsByTemplateEntryId: new Map(), startedAt: new Date() }), /Missing canonical progression prescription/);
  } },
  { name: "AMRAP and drop-tier structures are represented in generated sets", run: () => {
    const amrap = engine.generatePrescription({ state: { ...state, currentWeightLbs: 100 }, exercise: context, loggingModality: "reps_load", strategy: "double_progression", setScheme: "amrap", targetSets: 3 });
    assert.equal(amrap[2]?.targetReps, null);
    assert.equal(amrap[2]?.repTargetText, "AMRAP");
    const drop = engine.generatePrescription({ state: { ...state, currentWeightLbs: 100 }, exercise: context, loggingModality: "reps_load", strategy: "double_progression", setScheme: "drop_multi_tier", targetSets: 3 });
    assert.deepEqual(drop[0]?.tiers?.map((tier) => tier.order), [1, 2]);
    assert.equal(drop[0]?.tiers?.[1]?.targetWeight?.value, 90);
  } },
  { name: "successful drop tiers progress individually while preserving their intentional order", run: () => {
    const prior = history([8, 8, 8]);
    prior.sets[0] = { ...prior.sets[0]!, tiers: [
      { order: 1, targetWeight: { value: 100, unit: "lb" }, targetReps: 8, actualWeight: { value: 100, unit: "lb" }, actualReps: 8, status: "completed" },
      { order: 2, targetWeight: { value: 90, unit: "lb" }, targetReps: 10, actualWeight: { value: 90, unit: "lb" }, actualReps: 10, status: "completed" }
    ] };
    const targets = engine.generatePrescription({ state, exercise: context, loggingModality: "reps_load", strategy: "double_progression", setScheme: "drop_multi_tier", targetSets: 3, history: prior });
    assert.deepEqual(targets[0]?.tiers?.map((tier) => [tier.order, tier.targetWeight?.value, tier.targetReps]), [[1, 100, 9], [2, 90, 11]]);
  } },
  { name: "partial drop tier completion holds the whole tier sequence", run: () => {
    const prior = history([8, 8, 8]);
    prior.sets[0] = { ...prior.sets[0]!, tiers: [
      { order: 1, targetWeight: { value: 100, unit: "lb" }, targetReps: 8, actualWeight: { value: 100, unit: "lb" }, actualReps: 10, status: "completed" },
      { order: 2, targetWeight: { value: 90, unit: "lb" }, targetReps: 10, actualWeight: null, actualReps: null, status: "skipped" }
    ] };
    const targets = engine.generatePrescription({ state, exercise: context, loggingModality: "reps_load", strategy: "double_progression", setScheme: "drop_multi_tier", targetSets: 3, history: prior });
    assert.deepEqual(targets[0]?.tiers?.map((tier) => [tier.targetWeight?.value, tier.targetReps]), [[100, 8], [90, 10]]);
  } },
  { name: "one difficult set adjusts pending targets conservatively but skips manual overrides", run: () => {
    const targets = engine.adaptRemainingTargets({ targetReps: 10, targetWeightLbs: 100, actualReps: 8, actualWeightLbs: 100, status: "failed", repRangeMin: 8, repRangeMax: 12, pending: [
      { setId: "2", targetReps: 10, targetWeightLbs: 100 },
      { setId: "3", targetReps: 10, targetWeightLbs: 100, adaptationReason: "manual override" }
    ] });
    assert.deepEqual(targets, [{ setId: "2", targetReps: 9, targetWeightLbs: 100, reason: "Adjusted after missed target" }]);
  } },
  { name: "successful extra reps create only a one-rep pending adjustment", run: () => {
    const targets = engine.adaptRemainingTargets({ targetReps: 8, targetWeightLbs: 100, actualReps: 10, actualWeightLbs: 100, status: "completed", rir: "rir_4", repRangeMin: 6, repRangeMax: 12, pending: [{ setId: "2", targetReps: 8, targetWeightLbs: 100 }] });
    assert.equal(targets[0]?.targetReps, 9);
  } },
  { name: "workout-session factory consumes a prescription snapshot without changing it", run: () => {
    const targets = engine.generatePrescription({ state, exercise: context, loggingModality: "reps_load", strategy: "double_progression", setScheme: "drop_multi_tier", targetSets: 3, history: history([8, 8, 8]) });
    const snapshot = structuredClone(targets);
    const graph = new WorkoutSessionFactory().build({ userId: "user", programId: "program", programName: "Program", workoutTemplateDefinition: definition, progressionStatesV2: [state], prescribedTargetsByTemplateEntryId: new Map([["entry", targets]]), startedAt: new Date() });
    assert.deepEqual(graph.sets.map((set) => set.tiers), snapshot.map((set) => set.tiers));
  } }
];
