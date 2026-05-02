import { runHttpTestCases } from "./test-helpers/http-test-case.js";
import { healthHttpTestCases } from "../../health/health.http.test.js";
import { workoutHttpTestCases } from "./workout.http.test.js";
import { feedbackHttpTestCases } from "../../feedback/feedback.http.test.js";
import { passwordResetHttpTestCases } from "../../../lib/auth/password-reset.http.test.js";

await runHttpTestCases([...healthHttpTestCases, ...workoutHttpTestCases, ...feedbackHttpTestCases, ...passwordResetHttpTestCases]);
