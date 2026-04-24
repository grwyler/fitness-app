import { runHttpTestCases } from "./test-helpers/http-test-case.js";
import { workoutHttpTestCases } from "./workout.http.test.js";

await runHttpTestCases(workoutHttpTestCases);
