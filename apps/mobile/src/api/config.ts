type RuntimeRequire = (specifier: string) => unknown;

function resolveRuntimeRequire() {
  try {
    return new Function(
      "return typeof require !== 'undefined' ? require : undefined;"
    )() as undefined | RuntimeRequire;
  } catch {
    return undefined;
  }
}

const runtimeRequire = resolveRuntimeRequire();

function resolvePlatformOs() {
  try {
    if (!runtimeRequire) {
      return "ios";
    }

    const reactNativeModule = runtimeRequire("react-native") as {
      Platform?: {
        OS?: string;
      };
    };

    return reactNativeModule.Platform?.OS ?? "ios";
  } catch {
    return "ios";
  }
}

function resolveExpoExtra(name: string) {
  try {
    if (!runtimeRequire) {
      return undefined;
    }

    const expoConstantsModule = runtimeRequire("expo-constants") as {
      default?: {
        expoConfig?: { extra?: Record<string, string | undefined> };
        manifest?: { extra?: Record<string, string | undefined> };
        manifest2?: { extra?: { expoClient?: { extra?: Record<string, string | undefined> } } };
      };
    };
    const constants = expoConstantsModule.default;

    return (
      constants?.expoConfig?.extra?.[name] ??
      constants?.manifest?.extra?.[name] ??
      constants?.manifest2?.extra?.expoClient?.extra?.[name]
    );
  } catch {
    return undefined;
  }
}

const platformOs = resolvePlatformOs();

const defaultApiBaseUrl =
  platformOs === "android"
    ? "http://10.0.2.2:4000/api/v1"
    : "http://127.0.0.1:4000/api/v1";

const configuredApiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL ?? resolveExpoExtra("apiBaseUrl");

const isDevelopment =
  (typeof __DEV__ !== "undefined" && __DEV__) || process.env.NODE_ENV !== "production";

if (!configuredApiBaseUrl && !isDevelopment) {
  throw new Error(
    "EXPO_PUBLIC_API_BASE_URL is required for production builds. Set it to the deployed API origin plus /api/v1."
  );
}

export const apiConfig = {
  baseUrl: configuredApiBaseUrl ?? defaultApiBaseUrl
} as const;
