import type { PropsWithChildren } from "react";
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { colors, componentTokens, elevation, pressable, radius, spacing } from "../theme/tokens";

type CardPadding = "none" | "sm" | "md" | "lg";
export type CardVariant = "default" | "elevated" | "hero" | "interactive" | "muted" | "plain";

type BaseProps = PropsWithChildren<{
  padding?: CardPadding;
  elevated?: boolean;
  variant?: CardVariant;
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

export function Card({
  padding = "md",
  elevated = true,
  variant,
  style,
  contentStyle,
  children,
  onPress,
  disabled
}: PressableProps) {
  const resolvedVariant: CardVariant = variant ?? (onPress ? "interactive" : elevated ? "elevated" : "default");

  const baseStyle = [
    styles.base,
    resolvedVariant === "default" || resolvedVariant === "muted" ? styles.bordered : null,
    resolvedVariant === "default" ? styles.default : null,
    resolvedVariant === "elevated" ? styles.elevated : null,
    resolvedVariant === "hero" ? styles.hero : null,
    resolvedVariant === "interactive" ? styles.interactive : null,
    resolvedVariant === "muted" ? styles.muted : null,
    resolvedVariant === "plain" ? styles.plain : null,
    { padding: resolvePadding(padding) },
    style
  ];

  const content = contentStyle ? <View style={contentStyle}>{children}</View> : children;

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
        {content}
      </Pressable>
    );
  }

  return (
    <View style={baseStyle}>{content}</View>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.surface,
    borderRadius: componentTokens.card.borderRadius,
  },
  bordered: {
    borderColor: colors.border,
    borderWidth: componentTokens.card.borderWidth
  },
  default: {
    ...elevation.none
  },
  elevated: {
    ...elevation.xs
  },
  hero: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.lg,
    ...elevation.md
  },
  interactive: {
    ...elevation.xs
  },
  muted: {
    backgroundColor: colors.surfaceMuted,
    ...elevation.none
  },
  plain: {
    backgroundColor: "transparent",
    borderRadius: 0,
    borderWidth: 0,
    ...elevation.none
  },
  pressed: {
    opacity: pressable.pressedOpacity,
    transform: [{ scale: pressable.pressedScaleSubtle }]
  },
  disabled: {
    opacity: pressable.disabledOpacity
  }
});
