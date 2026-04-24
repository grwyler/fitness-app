import { runInfrastructureTestCases } from "./test-helpers/infrastructure-test-case.js";
import { workoutInfrastructureIntegrationTestCases } from "./use-cases/workout-infrastructure.integration.test.js";

await runInfrastructureTestCases(workoutInfrastructureIntegrationTestCases);
