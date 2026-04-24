import { StatusBar } from "expo-status-bar";
import { AppProviders } from "./src/app/providers/AppProviders";
import { DashboardScreen } from "./src/screens/DashboardScreen";

export default function App() {
  return (
    <AppProviders>
      <StatusBar style="dark" />
      <DashboardScreen />
    </AppProviders>
  );
}
