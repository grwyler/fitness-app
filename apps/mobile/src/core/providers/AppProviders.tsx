import type { PropsWithChildren } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { NavigationContainer, useNavigationContainerRef } from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { queryClient } from "./query-client";
import { AuthProvider } from "../auth/AuthProvider";
import type { RootStackParamList } from "../navigation/navigation-types";

function getWebUrl() {
  const href = (globalThis as any)?.location?.href;
  if (typeof href !== "string" || !href) {
    return null;
  }

  try {
    return new URL(href);
  } catch {
    return null;
  }
}

function applyWebInitialRoute(navigationRef: ReturnType<typeof useNavigationContainerRef<RootStackParamList>>) {
  const url = getWebUrl();
  if (!url) {
    return;
  }

  const path = url.pathname.replace(/\/+$/, "");
  const token = url.searchParams.get("token") ?? undefined;

  if (path === "/reset-password") {
    navigationRef.reset({
      index: 0,
      routes: [{ name: "ResetPassword", params: token ? { token } : undefined }]
    });
    return;
  }

  if (path === "/forgot-password") {
    navigationRef.reset({
      index: 0,
      routes: [{ name: "ForgotPassword" }]
    });
    return;
  }

  if (path === "/sign-in" && token) {
    navigationRef.reset({
      index: 0,
      routes: [{ name: "SignIn", params: { token } }]
    });
  }
}

export function AppProviders({ children }: PropsWithChildren) {
  const navigationRef = useNavigationContainerRef<RootStackParamList>();

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <NavigationContainer ref={navigationRef} onReady={() => applyWebInitialRoute(navigationRef)}>
            {children}
          </NavigationContainer>
        </AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
