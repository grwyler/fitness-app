export type DeploymentStage = "development" | "test" | "preview" | "staging" | "production";

export function detectDeploymentStage(input: {
  nodeEnv?: string | undefined;
  vercel?: string | undefined;
  vercelEnv?: string | undefined;
  vercelGitCommitRef?: string | undefined;
}): DeploymentStage {
  if (input.nodeEnv === "test") {
    return "test";
  }

  const isVercel = input.vercel === "1";
  if (isVercel) {
    const vercelEnv = input.vercelEnv;
    if (vercelEnv === "production") {
      return "production";
    }

    if (vercelEnv === "preview") {
      return input.vercelGitCommitRef === "develop" ? "staging" : "preview";
    }

    if (vercelEnv === "development") {
      return "development";
    }

    return "production";
  }

  return input.nodeEnv === "production" ? "production" : "development";
}

