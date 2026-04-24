import { runApplicationTestCases } from "./test-helpers/application-test-case.js";
import { applicationUseCaseTestCases } from "./use-cases/use-cases.test.js";

await runApplicationTestCases(applicationUseCaseTestCases);

