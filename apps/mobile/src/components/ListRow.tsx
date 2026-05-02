import type { ReactNode } from "react";
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { AppText } from "./AppText";
import { borderWidths, colors, pressable, radius, spacing } from "../theme/tokens";

export function ListRow(props: {
  title: string;
  subtitle?: string | null;
  right?: ReactNode;
  onPress?: () => void;
  disabled?: boolean;
  variant?: "default" | "muted";
  style?: StyleProp<ViewStyle>;
}) {
  const containerStyle = [
    styles.base,
    props.variant === "muted" ? styles.muted : null,
    props.style
  ];

  const content = (
    <View style={styles.content}>
      <View style={styles.textCol}>
        <AppText variant="bodyStrong">{props.title}</AppText>
        {props.subtitle ? (
          <AppText variant="caption" tone="secondary">
            {props.subtitle}
          </AppText>
        ) : null}
      </View>
      {props.right ? <View style={styles.right}>{props.right}</View> : null}
    </View>
  );

  if (!props.onPress) {
    return <View style={containerStyle}>{content}</View>;
  }

  return (
    <Pressable
      accessibilityRole="button"
      disabled={props.disabled}
      onPress={props.onPress}
      style={({ pressed }) => [
        containerStyle,
        props.disabled ? styles.disabled : null,
        pressed && !props.disabled ? styles.pressed : null
      ]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: "transparent",
    borderColor: colors.border,
    borderBottomWidth: borderWidths.hairline,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md
  },
  muted: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.sm,
    borderBottomWidth: 0
  },
  pressed: {
    opacity: pressable.pressedOpacity,
    transform: [{ scale: pressable.pressedScaleSubtle }],
    backgroundColor: colors.surfaceMuted
  },
  disabled: {
    opacity: pressable.disabledOpacity
  },
  content: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between"
  },
  textCol: {
    flex: 1,
    gap: 2
  },
  right: {
    alignItems: "flex-end",
    justifyContent: "center"
  }
});
