import { ActivityIndicator, StyleSheet, View } from "react-native";
import { colors, spacing } from "../theme/tokens";
import { AppText } from "./AppText";

export function LoadingState({ label }: { label: string }) {
  return (
    <View style={styles.container}>
      <ActivityIndicator color={colors.accentStrong} />
      <AppText tone="secondary">{label}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.xl
  }
});
