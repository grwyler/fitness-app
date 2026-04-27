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

const missingEnvVars = [
  publishableKey ? null : "EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY"
].filter((name): name is string => Boolean(name));

if (missingEnvVars.length > 0 && !isDevelopment) {
  throw new Error(
    `${missingEnvVars.join(", ")} required. Checked Expo public env and app config extra.`
  );
}

if (!isDevelopment && !publishableKey?.startsWith("pk_live_")) {
  throw new Error("EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY must be a production Clerk key that starts with pk_live_.");
}

export function AppProviders({ children }: PropsWithChildren) {
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
