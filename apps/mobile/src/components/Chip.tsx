import type { PropsWithChildren } from "react";
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { borderWidths, colors, pressable, radius, spacing, typography } from "../theme/tokens";
import { AppText } from "./AppText";

type Props = PropsWithChildren<{
  label: string;
  selected?: boolean;
  disabled?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}>;

export function Chip({ label, selected, disabled, onPress, style, children }: Props) {
  const content = (
    <View style={styles.row}>
      <AppText
        variant="meta"
        tone={selected ? "accent" : "secondary"}
        style={[styles.text, selected ? styles.textSelected : null]}
      >
        {label}
      </AppText>
      {children}
    </View>
  );

  if (!onPress) {
    return (
      <View style={[styles.base, selected ? styles.selected : null, disabled ? styles.disabled : null, style]}>
        {content}
      </View>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        selected ? styles.selected : null,
        disabled ? styles.disabled : null,
        pressed && !disabled ? styles.pressed : null,
        style
      ]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignSelf: "flex-start",
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: radius.pill,
    borderWidth: borderWidths.hairline,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6
  },
  selected: {
    backgroundColor: colors.accentMuted,
    borderColor: colors.accentStrong
  },
  pressed: {
    opacity: pressable.pressedOpacity,
    transform: [{ scale: pressable.pressedScale }]
  },
  disabled: {
    opacity: pressable.disabledOpacity
  },
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6
  },
  text: {
    fontFamily: typography.fontFamily.system,
    fontSize: 13,
    fontWeight: typography.weight.bold,
    textTransform: "capitalize"
  },
  textSelected: {
    color: colors.accentStrong
  }
});

