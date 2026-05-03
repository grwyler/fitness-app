import "react-native-gesture-handler";
import { StatusBar } from "expo-status-bar";
import { AppProviders } from "./src/core/providers/AppProviders";
import { AppNavigator } from "./src/core/navigation/AppNavigator";
import { initMobileObservability } from "./src/core/observability/observability";

initMobileObservability();

export default function App() {
  return (
    <AppProviders>
      <StatusBar style="dark" />
      <AppNavigator />
    </AppProviders>
  );
}
