const fs = require("fs");
const path = require("path");

const baseConfig = require("./app.json");
const rootPackageJson = require(path.resolve(__dirname, "..", "..", "package.json"));

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

function resolveEnvValue(name, options = {}) {
  const envFiles = [
    path.resolve(__dirname, ".env.local"),
    path.resolve(__dirname, ".env"),
    path.resolve(__dirname, "..", "..", ".env.local"),
    path.resolve(__dirname, "..", "..", ".env")
  ];

  if (process.env[name]) {
    return {
      source: "process.env",
      value: process.env[name]
    };
  }

  if (options.skipEnvFiles) {
    return {
      source: null,
      value: undefined
    };
  }

  for (const filePath of envFiles) {
    const parsed = parseEnvFile(filePath);

    if (parsed[name]) {
      return {
        source: filePath,
        value: parsed[name]
      };
    }
  }

  return {
    source: null,
    value: undefined
  };
}

function failConfig(message) {
  const errorMessage = `[mobile-config] ${message}`;
  console.error(errorMessage);
  throw new Error(errorMessage);
}

function assertProductionApiBaseUrl(apiBaseUrl, source) {
  const sourceLabel = source ? ` Source: ${source}.` : "";

  if (!apiBaseUrl) {
    failConfig(
      `Missing EXPO_PUBLIC_API_BASE_URL.${sourceLabel} Production web builds require https://setwiseapi.vercel.app/api/v1. Add it to the Vercel web project Production environment.`
    );
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(apiBaseUrl);
  } catch {
    failConfig(
      `Invalid EXPO_PUBLIC_API_BASE_URL.${sourceLabel} Expected https URL ending in /api/v1; received ${apiBaseUrl}.`
    );
  }

  if (parsedUrl.protocol !== "https:") {
    failConfig(
      `Invalid EXPO_PUBLIC_API_BASE_URL.${sourceLabel} Expected https URL ending in /api/v1; received ${apiBaseUrl}.`
    );
  }

  if (["localhost", "127.0.0.1", "10.0.2.2"].includes(parsedUrl.hostname)) {
    failConfig(
      `Invalid EXPO_PUBLIC_API_BASE_URL.${sourceLabel} Production web builds must not point to localhost; received ${apiBaseUrl}.`
    );
  }

  if (!parsedUrl.pathname.replace(/\/+$/, "").endsWith("/api/v1")) {
    failConfig(
      `Invalid EXPO_PUBLIC_API_BASE_URL.${sourceLabel} Expected URL path to end in /api/v1; received ${apiBaseUrl}.`
    );
  }
}

module.exports = () => {
  const expoConfig = baseConfig.expo ?? {};
  const appVersion = typeof rootPackageJson.version === "string" ? rootPackageJson.version.trim() : "";
  if (!appVersion) {
    failConfig("Unable to resolve app version from the repo root package.json.");
  }

  const isProductionBuild = process.env.VERCEL_ENV === "production";
  const resolveOptions = { skipEnvFiles: isProductionBuild };
  const apiBaseUrlResult = resolveEnvValue("EXPO_PUBLIC_API_BASE_URL", resolveOptions);
  const apiBaseUrl = apiBaseUrlResult.value;
  const sentryDsnResult = resolveEnvValue("EXPO_PUBLIC_SENTRY_DSN", resolveOptions);
  const sentryEnvironmentResult = resolveEnvValue("EXPO_PUBLIC_SENTRY_ENVIRONMENT", resolveOptions);
  const sentryReleaseResult = resolveEnvValue("EXPO_PUBLIC_SENTRY_RELEASE", resolveOptions);
  const observabilityEnabledResult = resolveEnvValue("EXPO_PUBLIC_OBSERVABILITY_ENABLED", resolveOptions);

  if (isProductionBuild) {
    assertProductionApiBaseUrl(apiBaseUrl, apiBaseUrlResult.source);
  }

  if (apiBaseUrl) {
    process.env.EXPO_PUBLIC_API_BASE_URL = apiBaseUrl;
  }
  if (sentryDsnResult.value) {
    process.env.EXPO_PUBLIC_SENTRY_DSN = sentryDsnResult.value;
  }
  if (sentryEnvironmentResult.value) {
    process.env.EXPO_PUBLIC_SENTRY_ENVIRONMENT = sentryEnvironmentResult.value;
  }
  if (sentryReleaseResult.value) {
    process.env.EXPO_PUBLIC_SENTRY_RELEASE = sentryReleaseResult.value;
  }
  if (observabilityEnabledResult.value) {
    process.env.EXPO_PUBLIC_OBSERVABILITY_ENABLED = observabilityEnabledResult.value;
  }

  process.env.EXPO_PUBLIC_APP_VERSION = appVersion;

  return {
    ...expoConfig,
    version: appVersion,
    extra: {
      ...expoConfig.extra,
      apiBaseUrl,
      appVersion
    }
  };
};
