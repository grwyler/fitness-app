import assert from "node:assert/strict";
import type { MobileTestCase } from "./mobile-test-case.js";
import {
  getExerciseEditVisibleFields,
  validateExerciseEditDraft
} from "../features/workout/utils/exercise-entry-edit.shared.js";

export const exerciseEntryEditTestCases: MobileTestCase[] = [
  {
    name: "Exercise edit visible fields: reps_load shows reps + weight",
    run: () => {
      const fields = getExerciseEditVisibleFields("reps_load");
      assert.equal(fields.sets, true);
      assert.equal(fields.repTarget, true);
      assert.equal(fields.weight, true);
      assert.equal(fields.duration, false);
      assert.equal(fields.distance, false);
      assert.equal(fields.rounds, false);
    }
  },
  {
    name: "Exercise edit visible fields: reps_only shows reps and hides weight",
    run: () => {
      const fields = getExerciseEditVisibleFields("reps_only");
      assert.equal(fields.repTarget, true);
      assert.equal(fields.weight, false);
    }
  },
  {
    name: "Exercise edit visible fields: time_distance shows duration + distance",
    run: () => {
      const fields = getExerciseEditVisibleFields("time_distance");
      assert.equal(fields.duration, true);
      assert.equal(fields.distance, true);
    }
  },
  {
    name: "Exercise edit visible fields: interval shows rounds + duration",
    run: () => {
      const fields = getExerciseEditVisibleFields("interval");
      assert.equal(fields.rounds, true);
      assert.equal(fields.duration, true);
    }
  },
  {
    name: "Exercise edit validation: requires at least one set",
    run: () => {
      const result = validateExerciseEditDraft({
        modality: "reps_only",
        unitSystem: "imperial",
        setsText: "",
        repsText: "8-12",
        weightText: "",
        durationText: "",
        distanceText: "",
        roundsText: ""
      });
      assert.equal(result.ok, false);
      if (!result.ok) {
        assert.equal(result.errorMessage, "Enter at least one set.");
      }
    }
  },
  {
    name: "Exercise edit validation: reps modalities require a rep target/range",
    run: () => {
      const result = validateExerciseEditDraft({
        modality: "reps_only",
        unitSystem: "imperial",
        setsText: "3",
        repsText: "",
        weightText: "",
        durationText: "",
        distanceText: "",
        roundsText: ""
      });
      assert.equal(result.ok, false);
      if (!result.ok) {
        assert.equal(result.errorMessage, "Enter a rep target or range.");
      }
    }
  },
  {
    name: "Exercise edit validation: reps_only ignores weight",
    run: () => {
      const result = validateExerciseEditDraft({
        modality: "reps_only",
        unitSystem: "imperial",
        setsText: "3",
        repsText: "8-12",
        weightText: "not a number",
        durationText: "",
        distanceText: "",
        roundsText: ""
      });
      assert.equal(result.ok, true);
      if (result.ok) {
        assert.equal(result.sets, 3);
        assert.equal(result.weightLbs, null);
      }
    }
  },
  {
    name: "Exercise edit validation: reps_load validates weight if provided",
    run: () => {
      const result = validateExerciseEditDraft({
        modality: "reps_load",
        unitSystem: "imperial",
        setsText: "3",
        repsText: "8-12",
        weightText: "not a number",
        durationText: "",
        distanceText: "",
        roundsText: ""
      });
      assert.equal(result.ok, false);
      if (!result.ok) {
        assert.equal(result.errorMessage, "Enter a valid weight.");
      }
    }
  },
  {
    name: "Exercise edit validation: timed exercises require duration",
    run: () => {
      const result = validateExerciseEditDraft({
        modality: "time",
        unitSystem: "imperial",
        setsText: "3",
        repsText: "",
        weightText: "",
        durationText: "",
        distanceText: "",
        roundsText: ""
      });
      assert.equal(result.ok, false);
      if (!result.ok) {
        assert.equal(result.errorMessage, "Enter a duration for timed exercises.");
      }
    }
  },
  {
    name: "Exercise edit validation: time_distance requires either distance or duration",
    run: () => {
      const result = validateExerciseEditDraft({
        modality: "time_distance",
        unitSystem: "imperial",
        setsText: "3",
        repsText: "",
        weightText: "",
        durationText: "",
        distanceText: "",
        roundsText: ""
      });
      assert.equal(result.ok, false);
      if (!result.ok) {
        assert.equal(result.errorMessage, "Enter a distance or duration for cardio.");
      }
    }
  },
  {
    name: "Exercise edit validation: time_distance accepts duration-only",
    run: () => {
      const result = validateExerciseEditDraft({
        modality: "time_distance",
        unitSystem: "imperial",
        setsText: "3",
        repsText: "",
        weightText: "",
        durationText: "20:00",
        distanceText: "",
        roundsText: ""
      });
      assert.equal(result.ok, true);
      if (result.ok) {
        assert.equal(result.durationSeconds, 1200);
        assert.equal(result.distanceMeters, null);
      }
    }
  },
  {
    name: "Exercise edit validation: distance exercises require distance",
    run: () => {
      const result = validateExerciseEditDraft({
        modality: "distance",
        unitSystem: "imperial",
        setsText: "3",
        repsText: "",
        weightText: "",
        durationText: "",
        distanceText: "",
        roundsText: ""
      });
      assert.equal(result.ok, false);
      if (!result.ok) {
        assert.equal(result.errorMessage, "Enter a distance.");
      }
    }
  },
  {
    name: "Exercise edit validation: interval exercises require rounds",
    run: () => {
      const result = validateExerciseEditDraft({
        modality: "interval",
        unitSystem: "imperial",
        setsText: "3",
        repsText: "",
        weightText: "",
        durationText: "",
        distanceText: "",
        roundsText: ""
      });
      assert.equal(result.ok, false);
      if (!result.ok) {
        assert.equal(result.errorMessage, "Enter rounds for interval exercises.");
      }
    }
  }
];

