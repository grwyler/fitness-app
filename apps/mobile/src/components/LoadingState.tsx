import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { colors, spacing } from "../theme/tokens";

export function LoadingState({ label }: { label: string }) {
  return (
    <View style={styles.container}>
      <ActivityIndicator color={colors.accentStrong} />
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.xl
  },
  label: {
    color: colors.textSecondary,
    fontSize: 16
  }
});
