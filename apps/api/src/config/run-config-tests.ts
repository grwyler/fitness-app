import { envConfigTestCases } from "./env.test.js";
import { runConfigTestCases } from "./test-helpers/config-test-case.js";
import { emailServiceTestCases } from "../lib/email/email.service.test.js";

await runConfigTestCases([...envConfigTestCases, ...emailServiceTestCases]);
