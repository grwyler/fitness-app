import { Text, View, StyleSheet } from "react-native";
import { Screen } from "../components/Screen";
import { LoadingState } from "../components/LoadingState";
import { colors, spacing } from "../theme/tokens";

export function AuthLoadingScreen() {
  return (
    <Screen>
      <LoadingState label="Restoring your session..." />
      <View style={styles.card}>
        <Text style={styles.line}>Checking for a saved MVP auth token.</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 12,
    gap: spacing.xs,
    padding: spacing.md
  },
  line: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 18
  }
});
