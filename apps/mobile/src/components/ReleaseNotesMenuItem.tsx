import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, spacing } from "../theme/tokens";
import { formatVersionLabel } from "../core/version/version-utils";

export function ReleaseNotesMenuItem(props: { version: string; onPress: () => void }) {
  const label = formatVersionLabel(props.version);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open release notes for ${label}`}
      onPress={props.onPress}
      style={({ pressed }) => [styles.menuItem, pressed && styles.menuItemPressed]}
    >
      <View style={styles.row}>
        <Text style={styles.title}>Version</Text>
        <Text style={styles.value}>{label}</Text>
      </View>
      <Text style={styles.subtitle}>What&apos;s new</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  menuItem: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  menuItemPressed: {
    backgroundColor: colors.surfaceMuted
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md
  },
  title: {
    color: colors.textPrimary,
    fontWeight: "600"
  },
  value: {
    color: colors.textSecondary,
    fontWeight: "700"
  },
  subtitle: {
    marginTop: 2,
    color: colors.textSecondary,
    fontSize: 12
  }
});

