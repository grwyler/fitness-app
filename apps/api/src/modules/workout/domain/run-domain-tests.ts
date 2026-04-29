import { progressionEngineTestCases } from "./services/progression-engine.test.js";
import { programAdvancementPolicyTestCases } from "./services/program-advancement-policy.test.js";
import { customWorkoutNamingTestCases } from "./services/custom-workout-naming.test.js";
import { customProgramDescriptionTestCases } from "./services/custom-program-description.test.js";
import { workoutValidationServiceTestCases } from "./services/workout-validation-service.test.js";
import { runDomainTestCases } from "./test-helpers/test-case.js";

await runDomainTestCases([
  ...customWorkoutNamingTestCases,
  ...customProgramDescriptionTestCases,
  ...progressionEngineTestCases,
  ...programAdvancementPolicyTestCases,
  ...workoutValidationServiceTestCases
]);
