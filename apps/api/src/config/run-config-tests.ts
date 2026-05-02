import { envConfigTestCases } from "./env.test.js";
import { runConfigTestCases } from "./test-helpers/config-test-case.js";

await runConfigTestCases(envConfigTestCases);

