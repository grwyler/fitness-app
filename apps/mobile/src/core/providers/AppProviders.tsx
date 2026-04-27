import type { PropsWithChildren } from "react";
import { ClerkProvider } from "@clerk/expo";
import { tokenCache } from "@clerk/expo/token-cache";
import { QueryClientProvider } from "@tanstack/react-query";
import { NavigationContainer } from "@react-navigation/native";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { apiConfig, isApiBaseUrlConfigured } from "../../api/config";
import { queryClient } from "./query-client";
import { AuthProvider } from "../auth/AuthProvider";
import { logSafeAuthDiagnostic } from "../auth/auth-debug";
import { StartupConfigErrorScreen } from "./StartupConfigErrorScreen";

function resolveNonEmptyString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

const publishableKey = resolveNonEmptyString(
  process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ??
    Constants.expoConfig?.extra?.clerkPublishableKey ??
    Constants.manifest?.extra?.clerkPublishableKey ??
    Constants.manifest2?.extra?.expoClient?.extra?.clerkPublishableKey
);

const isDevelopment = typeof __DEV__ !== "undefined" ? __DEV__ : process.env.NODE_ENV !== "production";

function getClerkPublishableKeyType(value: string | undefined) {
  if (!value) {
    return "missing";
  }

  if (value.startsWith("pk_live_")) {
    return "live";
  }

  if (value.startsWith("pk_test_")) {
    return "test";
  }

  return "invalid";
}

function maskKeySuffix(value: string | undefined) {
  if (!value) {
    return null;
  }

  return `...${value.slice(-4)}`;
}

const clerkKeyType = getClerkPublishableKeyType(publishableKey);
let hasLoggedClerkConfig = false;

const missingEnvVars = [
  publishableKey ? null : "EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY"
].filter((name): name is string => Boolean(name));

if (missingEnvVars.length > 0 && !isDevelopment) {
  throw new Error(
    `${missingEnvVars.join(", ")} required. Checked Expo public env and app config extra.`
  );
}

if (!isDevelopment && clerkKeyType === "invalid") {
  throw new Error("EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY must start with pk_live_ or pk_test_.");
}

export function AppProviders({ children }: PropsWithChildren) {
  if (!hasLoggedClerkConfig) {
    hasLoggedClerkConfig = true;
    logSafeAuthDiagnostic("clerk_config", {
      clerkKeySuffix: maskKeySuffix(publishableKey),
      clerkKeyType
    });
  }

  if (missingEnvVars.length > 0) {
    return (
      <SafeAreaProvider>
        <StartupConfigErrorScreen
          devApiBaseUrl={isApiBaseUrlConfigured ? undefined : apiConfig.baseUrl}
          missingEnvVars={missingEnvVars}
        />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <ClerkProvider
        publishableKey={publishableKey}
        {...(Platform.OS === "web" ? {} : { tokenCache })}
      >
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <NavigationContainer>{children}</NavigationContainer>
          </AuthProvider>
        </QueryClientProvider>
      </ClerkProvider>
    </SafeAreaProvider>
  );
}
