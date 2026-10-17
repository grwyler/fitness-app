import assert from "node:assert/strict";
import type { MobileTestCase } from "./mobile-test-case.js";
import { removeProgramDayAssignment } from "../features/workout/utils/program-creator.shared.js";
import type { ProgramDayAssignment } from "../features/workout/utils/program-creator.shared.js";

export const programDayAssignmentRemovalTestCases: MobileTestCase[] = [
  {
    name: "Removing an empty workout day removes it and renumbers remaining days",
    run: () => {
      const current: ProgramDayAssignment[] = [
        { dayNumber: 1, workout: { id: "w1", name: "A", category: "Full Body", sequenceOrder: 1, estimatedDurationMinutes: null, exercises: [] } as any },
        { dayNumber: 2, workout: { id: "w2", name: "B", category: "Full Body", sequenceOrder: 1, estimatedDurationMinutes: null, exercises: [] } as any },
        { dayNumber: 3, workout: null }
      ];

      const next = removeProgramDayAssignment({ current, dayNumber: 2 });
      assert.equal(next.length, 2);
      assert.deepEqual(next.map((d) => d.dayNumber), [1, 2]);
    }
  },
  {
    name: "Removing the only workout day is guarded by clearing the workout instead of removing the day",
    run: () => {
      const current: ProgramDayAssignment[] = [{ dayNumber: 1, workout: { id: "w1", name: "A", category: "Full Body", sequenceOrder: 1, estimatedDurationMinutes: null, exercises: [] } as any }];
      const next = removeProgramDayAssignment({ current, dayNumber: 1 });
      assert.equal(next.length, 1);
      assert.equal(next[0]?.workout, null);
    }
  }
];

