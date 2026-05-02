export type ConfigTestCase = {
  name: string;
  run: () => void | Promise<void>;
};

export async function runConfigTestCases(testCases: ConfigTestCase[]) {
  let failedCount = 0;

  for (const testCase of testCases) {
    try {
      await testCase.run();
      console.log(`PASS ${testCase.name}`);
    } catch (error) {
      failedCount += 1;
      console.error(`FAIL ${testCase.name}`);
      console.error(error);
    }
  }

  if (failedCount > 0) {
    throw new Error(`${failedCount} config test case(s) failed.`);
  }
}

