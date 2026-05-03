import Constants from "expo-constants";

type ExpoExtra = {
  appVersion?: unknown;
};

function readExtraVersion(extra: unknown) {
  const candidate = (extra as ExpoExtra | undefined)?.appVersion;
  return typeof candidate === "string" ? candidate.trim() : "";
}

export function resolveAppVersion() {
  const envVersion = typeof process.env.EXPO_PUBLIC_APP_VERSION === "string" ? process.env.EXPO_PUBLIC_APP_VERSION.trim() : "";
  if (envVersion) return envVersion;

  const expoConfigExtra = readExtraVersion(Constants.expoConfig?.extra);
  if (expoConfigExtra) return expoConfigExtra;

  const manifestExtra = readExtraVersion((Constants as any).manifest?.extra);
  if (manifestExtra) return manifestExtra;

  const expoVersion = typeof Constants.expoConfig?.version === "string" ? Constants.expoConfig.version.trim() : "";
  if (expoVersion) return expoVersion;

  return null;
}

