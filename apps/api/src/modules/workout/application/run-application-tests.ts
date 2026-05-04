import { runApplicationTestCases } from "./test-helpers/application-test-case.js";
import { applicationUseCaseTestCases } from "./use-cases/use-cases.test.js";
import { predefinedCatalogAuditTestCases } from "./use-cases/predefined-catalog.audit.test.js";
import { guidedRecommendationScenarioTestCases } from "./use-cases/guided-recommendation.scenarios.test.js";

await runApplicationTestCases([
  ...applicationUseCaseTestCases,
  ...guidedRecommendationScenarioTestCases,
  ...predefinedCatalogAuditTestCases
]);
