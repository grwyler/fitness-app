import assert from "node:assert/strict";
import { ProgramAdvancementPolicy } from "./program-advancement-policy.js";
import type { DomainTestCase } from "../test-helpers/test-case.js";

const policy = new ProgramAdvancementPolicy();

const templates = [
  { id: "template-b", sequenceOrder: 2 },
  { id: "template-a", sequenceOrder: 1 },
  { id: "template-c", sequenceOrder: 3 }
];

export const programAdvancementPolicyTestCases: DomainTestCase[] = [
  {
    name: "ProgramAdvancementPolicy resolves the initial template to the lowest sequence order",
    run: () => {
      assert.equal(policy.resolveInitialTemplateId(templates), "template-a");
    }
  },
  {
    name: "ProgramAdvancementPolicy returns the current template when the workout is still in progress",
    run: () => {
      const nextTemplateId = policy.resolveNextTemplateId({
        templates,
        currentTemplateId: "template-b",
        completedTemplateId: "template-b",
        workoutSessionStatus: "in_progress"
      });

      assert.equal(nextTemplateId, "template-b");
    }
  },
  {
    name: "ProgramAdvancementPolicy returns the current template when the workout is abandoned",
    run: () => {
      const nextTemplateId = policy.resolveNextTemplateId({
        templates,
        currentTemplateId: "template-b",
        completedTemplateId: "template-b",
        workoutSessionStatus: "abandoned"
      });

      assert.equal(nextTemplateId, "template-b");
    }
  },
  {
    name: "ProgramAdvancementPolicy advances to the next template after a completed workout",
    run: () => {
      const nextTemplateId = policy.resolveNextTemplateId({
        templates,
        currentTemplateId: "template-a",
        completedTemplateId: "template-a",
        workoutSessionStatus: "completed"
      });

      assert.equal(nextTemplateId, "template-b");
    }
  },
  {
    name: "ProgramAdvancementPolicy wraps to the first template after completing the final template",
    run: () => {
      const nextTemplateId = policy.resolveNextTemplateId({
        templates,
        currentTemplateId: "template-c",
        completedTemplateId: "template-c",
        workoutSessionStatus: "completed"
      });

      assert.equal(nextTemplateId, "template-a");
    }
  }
];
