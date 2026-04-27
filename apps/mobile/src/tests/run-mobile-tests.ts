import { runMobileTestCases } from "./mobile-test-case.js";
import { mobileApiTestCases } from "./mobile-api.test.js";
import { authBehaviorTestCases } from "./auth-behavior.test.js";
import { feedbackTestCases } from "./feedback.test.js";
import { progressionScreenTestCases } from "./progression-screen.test.js";
import { setLoggingTestCases } from "./set-logging.test.js";
import { activeWorkoutScreenTestCases } from "./active-workout-screen.test.js";
import { workoutSummaryTestCases } from "./workout-summary.test.js";
import { historyDetailTestCases } from "./history-detail.test.js";

void runMobileTestCases([
  ...mobileApiTestCases,
  ...authBehaviorTestCases,
  ...feedbackTestCases,
  ...progressionScreenTestCases,
  ...setLoggingTestCases,
  ...activeWorkoutScreenTestCases,
  ...workoutSummaryTestCases,
  ...historyDetailTestCases
]);
