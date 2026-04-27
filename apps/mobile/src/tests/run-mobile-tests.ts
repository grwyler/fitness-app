import { runMobileTestCases } from "./mobile-test-case.js";
import { mobileApiTestCases } from "./mobile-api.test.js";
import { authBehaviorTestCases } from "./auth-behavior.test.js";
import { feedbackTestCases } from "./feedback.test.js";
import { progressionScreenTestCases } from "./progression-screen.test.js";
import { setLoggingTestCases } from "./set-logging.test.js";

void runMobileTestCases([
  ...mobileApiTestCases,
  ...authBehaviorTestCases,
  ...feedbackTestCases,
  ...progressionScreenTestCases,
  ...setLoggingTestCases
]);
