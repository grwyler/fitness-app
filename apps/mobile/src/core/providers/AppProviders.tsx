import type { PropsWithChildren } from "react";
import { ClerkProvider } from "@clerk/expo";
import { tokenCache } from "@clerk/expo/token-cache";
import { QueryClientProvider } from "@tanstack/react-query";
import { NavigationContainer } from "@react-navigation/native";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { queryClient } from "./query-client";
import { AuthProvider } from "../auth/AuthProvider";

const fallbackPublishableKey =
  "pk_test_Y29tcGxldGUtc3VuYmVhbS0zOS5jbGVyay5hY2NvdW50cy5kZXYk";

const publishableKey =
  process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ??
  Constants.expoConfig?.extra?.clerkPublishableKey ??
  Constants.manifest?.extra?.clerkPublishableKey ??
  Constants.manifest2?.extra?.expoClient?.extra?.clerkPublishableKey ??
  fallbackPublishableKey;

if (!publishableKey) {
  throw new Error(
    "EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY is required. Checked Expo public env and app config extra."
  );
}

export function AppProviders({ children }: PropsWithChildren) {
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
