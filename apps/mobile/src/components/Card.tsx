import type { PropsWithChildren } from "react";
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { borderWidths, colors, elevation, pressable, radius, spacing } from "../theme/tokens";

type CardPadding = "none" | "sm" | "md" | "lg";

type BaseProps = PropsWithChildren<{
  padding?: CardPadding;
  elevated?: boolean;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
}>;

type PressableProps = BaseProps & {
  onPress?: () => void;
  disabled?: boolean;
};

function resolvePadding(padding: CardPadding | undefined) {
  switch (padding) {
    case "none":
      return 0;
    case "sm":
      return spacing.md;
    case "md":
      return spacing.lg;
    case "lg":
    default:
      return spacing.lg;
  }
}

export function Card({ padding = "md", elevated = true, style, contentStyle, children, onPress, disabled }: PressableProps) {
  const baseStyle = [
    styles.base,
    elevated ? styles.elevated : null,
    { padding: resolvePadding(padding) },
    style
  ];

  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        disabled={disabled}
        onPress={onPress}
        style={({ pressed }) => [
          baseStyle,
          disabled ? styles.disabled : null,
          pressed ? styles.pressed : null
        ]}
      >
        <View style={contentStyle}>{children}</View>
      </Pressable>
    );
  }

  return (
    <View style={baseStyle}>
      <View style={contentStyle}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: borderWidths.hairline
  },
  elevated: elevation.sm,
  pressed: {
    opacity: pressable.pressedOpacity,
    transform: [{ scale: pressable.pressedScale }]
  },
  disabled: {
    opacity: pressable.disabledOpacity
  }
});

