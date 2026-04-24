import { runMobileTestCases } from "./mobile-test-case";
import { mobileApiTestCases } from "./mobile-api.test";
import { feedbackTestCases } from "./feedback.test";

void runMobileTestCases([...mobileApiTestCases, ...feedbackTestCases]);
