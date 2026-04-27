import { Text, View, StyleSheet } from "react-native";
import { Screen } from "../components/Screen";
import { LoadingState } from "../components/LoadingState";
import { PrimaryButton } from "../components/PrimaryButton";
import {
  clearAuthDebugTimeline,
  clearLastAuthDebugMessage,
  getAuthDebugTimeline,
  isDevAuthDebugEnabled
} from "../core/auth/auth-debug";
import { useAppAuth } from "../core/auth/AuthProvider";
import { colors, spacing } from "../theme/tokens";

export function AuthLoadingScreen() {
  const showDevAuthDebug = isDevAuthDebugEnabled();
  const auth = useAppAuth();
  const showFailureState = auth.authDebug.timeoutReached || auth.authDebug.tokenStatus === "unavailable";
  const devTimeline = showDevAuthDebug ? getAuthDebugTimeline().slice(-12) : [];

  return (
    <Screen>
      {showFailureState ? (
        <View style={styles.failureHero}>
          <Text style={styles.failureTitle}>Session check failed</Text>
          <Text style={styles.error}>
            {auth.authDebug.loadingReason ?? "A signed-in session was found, but no backend token became available."}
          </Text>
        </View>
      ) : (
        <LoadingState label="Checking your session..." />
      )}

      {showFailureState ? (
        <View style={styles.card}>
          <PrimaryButton label="Back to sign in" onPress={() => void auth.signOut()} tone="secondary" />
          {showDevAuthDebug ? (
            <PrimaryButton
              label="Clear auth debug"
              onPress={() => {
                clearLastAuthDebugMessage();
                clearAuthDebugTimeline();
              }}
              tone="secondary"
            />
          ) : null}
        </View>
      ) : null}

      {showDevAuthDebug ? (
        <View style={styles.card}>
          <Text style={styles.title}>Session Debug</Text>
          <Text style={styles.line}>Clerk loaded: {auth.authDebug.isClerkLoaded ? "yes" : "no"}</Text>
          <Text style={styles.line}>Signed in: {auth.authDebug.isSignedIn ? "yes" : "no"}</Text>
          <Text style={styles.line}>Session id: {auth.authDebug.sessionId ?? "null"}</Text>
          <Text style={styles.line}>User id: {auth.authDebug.userId ?? "null"}</Text>
          <Text style={styles.line}>Token status: {auth.authDebug.tokenStatus}</Text>
          <Text style={styles.line}>Token present: {auth.authDebug.tokenPresent ? "yes" : "no"}</Text>
          <Text style={styles.line}>getToken state: {auth.authDebug.getTokenState}</Text>
          <Text style={styles.line}>Loading reason: {auth.authDebug.loadingReason ?? "null"}</Text>
          <Text style={styles.line}>Timeout reached: {auth.authDebug.timeoutReached ? "yes" : "no"}</Text>
          {devTimeline.map((entry, index) => (
            <Text key={`${entry.at}-${index}`} style={styles.timelineEntry}>
              {entry.at} | {entry.event}
              {entry.details ? ` | ${entry.details}` : ""}
            </Text>
          ))}
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 16,
    gap: spacing.xs,
    padding: spacing.md
  },
  failureHero: {
    backgroundColor: "#f4ddd7",
    borderRadius: 16,
    gap: spacing.xs,
    padding: spacing.md
  },
  failureTitle: {
    color: "#7a2d25",
    fontSize: 16,
    fontWeight: "700"
  },
  title: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: "700"
  },
  line: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 18
  },
  timelineEntry: {
    color: colors.textSecondary,
    fontSize: 11,
    lineHeight: 16
  },
  error: {
    color: "#9c3b31",
    fontSize: 13,
    lineHeight: 18
  }
});
