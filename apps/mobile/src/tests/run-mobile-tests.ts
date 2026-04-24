import { runMobileTestCases } from "./mobile-test-case.js";
import { mobileApiTestCases } from "./mobile-api.test.js";
import { feedbackTestCases } from "./feedback.test.js";

void runMobileTestCases([...mobileApiTestCases, ...feedbackTestCases]);
