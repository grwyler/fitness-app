import { progressionEngineTestCases } from "./services/progression-engine.test.js";
import { programAdvancementPolicyTestCases } from "./services/program-advancement-policy.test.js";
import { workoutValidationServiceTestCases } from "./services/workout-validation-service.test.js";
import { runDomainTestCases } from "./test-helpers/test-case.js";

await runDomainTestCases([
  ...progressionEngineTestCases,
  ...programAdvancementPolicyTestCases,
  ...workoutValidationServiceTestCases
]);
