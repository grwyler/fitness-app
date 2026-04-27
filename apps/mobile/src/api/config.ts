function resolvePlatformOs() {
  try {
    const runtimeRequire = new Function(
      "return typeof require !== 'undefined' ? require : undefined;"
    )() as undefined | ((specifier: string) => unknown);

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

const platformOs = resolvePlatformOs();

const defaultApiBaseUrl =
  platformOs === "android"
      ? "http://10.0.2.2:4000/api/v1"
      : "http://127.0.0.1:4000/api/v1";

export const apiConfig = {
  baseUrl: process.env.EXPO_PUBLIC_API_BASE_URL ?? defaultApiBaseUrl
} as const;
