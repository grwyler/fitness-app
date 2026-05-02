import { EnvConfigError, getEnv } from "../config/env.js";
import { detectDeploymentStage } from "../config/deployment-stage.js";

function shouldValidateEnv() {
  const stage = detectDeploymentStage({
    nodeEnv: process.env.NODE_ENV,
    vercel: process.env.VERCEL,
    vercelEnv: process.env.VERCEL_ENV,
    vercelGitCommitRef: process.env.VERCEL_GIT_COMMIT_REF
  });

  return stage === "production" || stage === "staging";
}

if (!shouldValidateEnv()) {
  process.exit(0);
}

try {
  getEnv();
  console.log("API environment configuration looks valid for production.");
} catch (error) {
  if (error instanceof EnvConfigError) {
    console.error(error.message);
  } else {
    console.error("API environment validation failed.");
    console.error(error);
  }

  process.exit(1);
}
