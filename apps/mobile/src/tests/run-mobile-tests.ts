import { runMobileTestCases } from "./mobile-test-case.js";
import { mobileApiTestCases } from "./mobile-api.test.js";
import { authBehaviorTestCases } from "./auth-behavior.test.js";
import { feedbackTestCases } from "./feedback.test.js";
import { progressionScreenTestCases } from "./progression-screen.test.js";
import { setLoggingTestCases } from "./set-logging.test.js";
import { activeWorkoutScreenTestCases } from "./active-workout-screen.test.js";
import { workoutSummaryTestCases } from "./workout-summary.test.js";
import { historyDetailTestCases } from "./history-detail.test.js";
import { completionCacheTestCases } from "./completion-cache.test.js";
import { dashboardProgramTestCases } from "./dashboard-program.test.js";
import { programCreatorTestCases } from "./program-creator.test.js";
import { unitSystemMetricTestCases } from "./unit-system-metric.test.js";
import { mobileConfigTestCases } from "./mobile-config.test.js";
import { guidedProgramIntakeTestCases } from "./guided-program-intake.test.js";
import { releaseNotesTestCases } from "./release-notes.test.js";
import { oauthConfigTestCases } from "./oauth-config.test.js";
import { manualProgramOnboardingTestCases } from "./manual-program-onboarding.test.js";
import { programBuilderCardActionsTestCases } from "./program-builder-card-actions.test.js";
import { exerciseEntryEditTestCases } from "./exercise-entry-edit.test.js";
import { programBuilderRemovalsTestCases } from "./program-builder-removals.test.js";
import { programDayAssignmentRemovalTestCases } from "./program-day-assignment-removal.test.js";

runMobileTestCases([
  ...mobileConfigTestCases,
  ...mobileApiTestCases,
  ...authBehaviorTestCases,
  ...oauthConfigTestCases,
  ...feedbackTestCases,
  ...progressionScreenTestCases,
  ...setLoggingTestCases,
  ...releaseNotesTestCases,
  ...unitSystemMetricTestCases,
  ...activeWorkoutScreenTestCases,
  ...workoutSummaryTestCases,
  ...completionCacheTestCases,
  ...dashboardProgramTestCases,
  ...programCreatorTestCases,
  ...manualProgramOnboardingTestCases,
  ...programBuilderCardActionsTestCases,
  ...programBuilderRemovalsTestCases,
  ...programDayAssignmentRemovalTestCases,
  ...exerciseEntryEditTestCases,
  ...historyDetailTestCases,
  ...guidedProgramIntakeTestCases,
]).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
