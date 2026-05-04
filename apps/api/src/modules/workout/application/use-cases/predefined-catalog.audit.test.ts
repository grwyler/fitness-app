import assert from "node:assert/strict";
import { auditSeedProgramCatalog } from "@fitness/db";
import type { ApplicationTestCase } from "../test-helpers/application-test-case.js";

export const predefinedCatalogAuditTestCases: ApplicationTestCase[] = [
  {
    name: "Predefined catalog passes strict audit",
    run: () => {
      const result = auditSeedProgramCatalog();
      if (!result.ok) {
        const formatted = result.issues
          .slice(0, 40)
          .map((issue) => {
            const scope = [issue.programName, issue.workoutName].filter(Boolean).join(" / ");
            return `- ${issue.code}${scope ? ` (${scope})` : ""}: ${issue.message}`;
          })
          .join("\n");

        assert.fail(`Catalog audit failed with ${result.issues.length} issue(s).\n${formatted}`);
      }
    }
  }
];

