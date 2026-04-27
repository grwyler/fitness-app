const fs = require("fs");
const path = require("path");

const baseConfig = require("./app.json");

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  const contents = fs.readFileSync(filePath, "utf8");
  const entries = {};

  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");
    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    entries[key] = value;
  }

  return entries;
}

function resolveEnvValue(name) {
  const envFiles = [
    path.resolve(__dirname, ".env.local"),
    path.resolve(__dirname, ".env"),
    path.resolve(__dirname, "..", "..", ".env.local"),
    path.resolve(__dirname, "..", "..", ".env")
  ];

  if (process.env[name]) {
    return process.env[name];
  }

  for (const filePath of envFiles) {
    const parsed = parseEnvFile(filePath);

    if (parsed[name]) {
      return parsed[name];
    }
  }

  return undefined;
}

function isLiveClerkPublishableKey(value) {
  return typeof value === "string" && value.startsWith("pk_live_");
}

module.exports = () => {
  const expoConfig = baseConfig.expo ?? {};
  const clerkPublishableKey =
    resolveEnvValue("EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY") ??
    resolveEnvValue("CLERK_PUBLISHABLE_KEY");
  const apiBaseUrl = resolveEnvValue("EXPO_PUBLIC_API_BASE_URL");
  const isProductionBuild =
    process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production";

  if (isProductionBuild && !apiBaseUrl) {
    throw new Error("EXPO_PUBLIC_API_BASE_URL is required for production mobile web builds.");
  }

  if (
    isProductionBuild &&
    /^https?:\/\/(localhost|127\.0\.0\.1|10\.0\.2\.2)(:|\/|$)/.test(apiBaseUrl ?? "")
  ) {
    throw new Error("EXPO_PUBLIC_API_BASE_URL must not point to localhost in production mobile web builds.");
  }

  if (isProductionBuild && !clerkPublishableKey) {
    throw new Error("EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY is required for production mobile web builds.");
  }

  if (isProductionBuild && !isLiveClerkPublishableKey(clerkPublishableKey)) {
    throw new Error("EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY must be a production Clerk key that starts with pk_live_.");
  }

  if (apiBaseUrl) {
    process.env.EXPO_PUBLIC_API_BASE_URL = apiBaseUrl;
  }

  if (clerkPublishableKey) {
    process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY = clerkPublishableKey;
  }

  return {
    ...expoConfig,
    extra: {
      ...expoConfig.extra,
      clerkPublishableKey,
      apiBaseUrl
    }
  };
};
