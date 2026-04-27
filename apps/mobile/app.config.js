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
    path.resolve(__dirname, ".env"),
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

module.exports = () => {
  const expoConfig = baseConfig.expo ?? {};

  return {
    ...expoConfig,
    extra: {
      ...expoConfig.extra,
      clerkPublishableKey:
        resolveEnvValue("EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY") ??
        resolveEnvValue("CLERK_PUBLISHABLE_KEY"),
      apiBaseUrl: resolveEnvValue("EXPO_PUBLIC_API_BASE_URL")
    }
  };
};
