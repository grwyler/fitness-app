import type { PropsWithChildren } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { NavigationContainer } from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { queryClient } from "./query-client";

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <NavigationContainer>{children}</NavigationContainer>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
