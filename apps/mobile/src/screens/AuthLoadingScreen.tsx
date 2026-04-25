import { Screen } from "../components/Screen";
import { LoadingState } from "../components/LoadingState";

export function AuthLoadingScreen() {
  return (
    <Screen>
      <LoadingState label="Checking your session..." />
    </Screen>
  );
}
