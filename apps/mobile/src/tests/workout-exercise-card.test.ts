import assert from "node:assert/strict";
import { isValidElement, type ReactNode } from "react";
import type { ExerciseEntryDto, SetDto } from "@fitness/shared";
import { AppText } from "../components/AppText.js";
import { Chip } from "../components/Chip.js";
import { SetMetricInput } from "../components/SetMetricInput.js";
import { WorkoutExerciseCard } from "../components/WorkoutExerciseCard.js";
import type { SetLogDraft } from "../features/workout/utils/set-logging.shared.js";
import type { MobileTestCase } from "./mobile-test-case.js";

function collect(node: ReactNode, result: Array<{ type: unknown; props: Record<string, unknown> }> = []) {
  if (Array.isArray(node)) {
    for (const child of node) collect(child, result);
  } else if (isValidElement(node)) {
    const item = node as { type: unknown; props: { children?: ReactNode; [key: string]: unknown } };
    result.push({ type: item.type, props: item.props });
    collect(item.props.children, result);
    collect(item.props.helperRight as ReactNode, result);
  }
  return result;
}

function set(input: Partial<SetDto> = {}): SetDto {
  return {
    id: "set-current", exerciseEntryId: "entry", setNumber: 1, setType: "working", targetReps: 10, originalTargetReps: 10, actualReps: null,
    targetWeight: { value: 135, unit: "lb" }, originalTargetWeight: { value: 135, unit: "lb" }, actualWeight: null,
    targetDurationSeconds: null, actualDurationSeconds: null, targetDistanceMeters: null, actualDistanceMeters: null,
    targetRounds: null, actualRounds: null, status: "pending", rir: null, failureStatus: null, completedAt: null, ...input
  };
}

function exercise(sets: SetDto[], setScheme: ExerciseEntryDto["setScheme"] = "straight"): ExerciseEntryDto {
  return {
    id: "entry", exerciseId: "exercise", workoutTemplateExerciseEntryId: "template-entry", exerciseName: "Press", category: "compound", loggingModality: "reps_load",
    sequenceOrder: 1, targetSets: sets.length, setScheme, targetReps: 10, repRangeMin: 8, repRangeMax: 12, targetWeight: { value: 135, unit: "lb" },
    restSeconds: 120, effortFeedback: null, completedAt: null, sets
  };
}

const noop = () => {};
function render(exerciseDto: ExerciseEntryDto, drafts: Record<string, SetLogDraft> = {}, onChangeSetLogDraft: (id: string, draft: SetLogDraft) => void = noop) {
  const root = WorkoutExerciseCard({
    exercise: exerciseDto, unitSystem: "imperial", setLogDraftsBySetId: drafts, onChangeSetLogDraft,
    onAddSet: noop, onDeleteSet: noop, onLogSet: noop, onStartEditSet: noop, onCancelEditSet: noop, onUpdateLoggedSet: noop, onSelectFeedback: noop
  });
  return collect(root);
}

function texts(elements: ReturnType<typeof collect>) {
  return elements.filter((item) => item.type === AppText).map((item) => item.props.children).flat(Infinity).filter((item): item is string | number => typeof item === "string" || typeof item === "number").map(String);
}

export const workoutExerciseCardTestCases: MobileTestCase[] = [
  {
    name: "Active workout component keeps target, previous reference, and manual actual entry distinct",
    run: () => {
      const previous = set({ id: "set-previous", setNumber: 1, targetReps: 8, targetWeight: { value: 130, unit: "lb" }, actualReps: 8, actualWeight: { value: 132.5, unit: "lb" }, status: "completed" });
      const current = set({ id: "set-current", setNumber: 2, targetReps: 9, targetWeight: { value: 140, unit: "lb" }, previousActualReps: 8, previousActualWeight: { value: 132.5, unit: "lb" } });
      const draft: SetLogDraft = { repsText: "10", weightText: "150", durationText: "", distanceText: "", roundsText: "", setType: "working" };
      const elements = render(exercise([previous, current]), { "set-current": draft });
      const labels = texts(elements).join(" ");
      assert.match(labels, /Target 9 reps at 140 lb/);
      assert.match(labels, /Last time\s*:\s*8 reps\s*@\s*132\.5 lb/);
      const reps = elements.find((item) => item.type === SetMetricInput && item.props.label === "Actual reps");
      const load = elements.find((item) => item.type === SetMetricInput && String(item.props.label).startsWith("Actual load"));
      assert.equal(reps?.props.value, "10");
      assert.equal(load?.props.value, "150");
    }
  },
  {
    name: "Active workout component renders tier targets and editable actuals with explicit status choices",
    run: () => {
      const current = set({ tiers: [
        { order: 1, targetWeight: { value: 135, unit: "lb" }, targetReps: 10, actualWeight: null, actualReps: null, status: "pending" },
        { order: 2, targetWeight: { value: 115, unit: "lb" }, targetReps: 12, actualWeight: null, actualReps: null, status: "pending" }
      ] });
      let changed: SetLogDraft | null = null;
      const elements = render(exercise([current], "drop_multi_tier"), {}, (_id, next) => { changed = next; });
      const labels = texts(elements).join(" ");
      assert.match(labels, /Extended set/);
      assert.match(labels, /Tier\s+1\s*:\s*target\s+10\s*@\s*135 lb/);
      assert.ok(elements.some((item) => item.type === SetMetricInput && item.props.accessibilityLabel === "Set 1 tier 1 actual load"));
      const tierReps = elements.find((item) => item.type === SetMetricInput && item.props.accessibilityLabel === "Set 1 tier 1 actual reps");
      (tierReps?.props.onChangeText as ((value: string) => void) | undefined)?.("11");
      assert.equal(changed?.tierDrafts?.[1]?.repsText, "11");
      const skip = elements.find((item) => item.type === Chip && item.props.label === "Skip");
      (skip?.props.onPress as (() => void) | undefined)?.();
      assert.equal(changed?.tierDrafts?.[1]?.status, "skipped");
    }
  },
  {
    name: "Refreshed adapted targets remain visible without replacing a manual actual draft",
    run: () => {
      const changedDraft: SetLogDraft = { repsText: "11", weightText: "145", durationText: "", distanceText: "", roundsText: "", setType: "working" };
      const adapted = set({ targetReps: 9, targetWeight: { value: 140, unit: "lb" }, adaptationReason: "Adjusted to performed load" });
      const elements = render(exercise([adapted]), { "set-current": changedDraft });
      const labels = texts(elements).join(" ");
      assert.match(labels, /Target 9 reps at 140 lb/);
      assert.match(labels, /Adjusted to performed load/);
      assert.equal(elements.find((item) => item.type === SetMetricInput && item.props.label === "Actual reps")?.props.value, "11");
      assert.equal(elements.find((item) => item.type === SetMetricInput && String(item.props.label).startsWith("Actual load"))?.props.value, "145");
    }
  }
];
