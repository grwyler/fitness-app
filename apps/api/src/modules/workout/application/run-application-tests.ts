import { runApplicationTestCases } from "./test-helpers/application-test-case.js";
import { applicationUseCaseTestCases } from "./use-cases/use-cases.test.js";
import { predefinedCatalogAuditTestCases } from "./use-cases/predefined-catalog.audit.test.js";
import { guidedRecommendationScenarioTestCases } from "./use-cases/guided-recommendation.scenarios.test.js";
import { coachReviewSnapshotServiceTestCases } from "./services/coach-review-snapshot.service.test.js";
import { updateManualProgramGoalContextUseCaseTestCases } from "./use-cases/update-manual-program-goal-context.use-case.test.js";

await runApplicationTestCases([
  ...applicationUseCaseTestCases,
  ...updateManualProgramGoalContextUseCaseTestCases,
  ...coachReviewSnapshotServiceTestCases,
  ...guidedRecommendationScenarioTestCases,
  ...predefinedCatalogAuditTestCases
]);
