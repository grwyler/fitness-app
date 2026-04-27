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

function getClerkPublishableKeyType(value) {
  if (typeof value !== "string") {
    return "invalid";
  }

  if (value.startsWith("pk_live_")) {
    return "live";
  }

  if (value.startsWith("pk_test_")) {
    return "test";
  }

  return "invalid";
}

function maskValue(value) {
  if (!value) {
    return "<missing>";
  }

  if (value.length <= 12) {
    return `${value.slice(0, 4)}...`;
  }

  return `${value.slice(0, 8)}...${value.slice(-4)}`;
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

function assertProductionClerkPublishableKey(clerkPublishableKey, source) {
  const sourceLabel = source ? ` Source: ${source}.` : "";
  const keyType = getClerkPublishableKeyType(clerkPublishableKey);

  if (!clerkPublishableKey) {
    failConfig(
      `Missing EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY.${sourceLabel} Production web builds require a Clerk publishable key starting with pk_live_ or pk_test_. Add it to the Vercel web project Production environment.`
    );
  }

  if (keyType === "invalid") {
    failConfig(
      `Invalid EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY.${sourceLabel} Expected pk_live_... or pk_test_...; received ${maskValue(clerkPublishableKey)}.`
    );
  }

  if (keyType === "test") {
    console.warn(
      `[mobile-config] EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY is using a Clerk development key (pk_test_...) in a deployed build. This is allowed for MVP testing; configure the matching Clerk DEVELOPMENT instance for https://setwisefit.vercel.app.`
    );
  }
}

module.exports = () => {
  const expoConfig = baseConfig.expo ?? {};
  const isProductionBuild = process.env.VERCEL_ENV === "production";
  const resolveOptions = { skipEnvFiles: isProductionBuild };
  const clerkPublishableKeyResult = resolveEnvValue("EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY", resolveOptions);
  const legacyClerkPublishableKeyResult = resolveEnvValue("CLERK_PUBLISHABLE_KEY", resolveOptions);
  const apiBaseUrlResult = resolveEnvValue("EXPO_PUBLIC_API_BASE_URL", resolveOptions);
  const clerkPublishableKey =
    clerkPublishableKeyResult.value ?? legacyClerkPublishableKeyResult.value;
  const apiBaseUrl = apiBaseUrlResult.value;

  if (isProductionBuild) {
    assertProductionApiBaseUrl(apiBaseUrl, apiBaseUrlResult.source);
    assertProductionClerkPublishableKey(clerkPublishableKeyResult.value, clerkPublishableKeyResult.source);
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
