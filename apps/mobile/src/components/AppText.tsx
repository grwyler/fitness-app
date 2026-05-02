import type { PropsWithChildren } from "react";
import { StyleSheet, Text, type TextProps, type TextStyle } from "react-native";
import { colors, typography } from "../theme/tokens";

export type AppTextVariant =
  | "screenTitle"
  | "title1"
  | "title2"
  | "headline"
  | "cardTitle"
  | "body"
  | "bodyStrong"
  | "meta"
  | "caption"
  | "sectionLabel"
  | "error"
  | "label"
  | "overline";

export type AppTextTone = "primary" | "secondary" | "tertiary" | "accent" | "danger" | "success" | "inverse";

type Props = PropsWithChildren<
  TextProps & {
    variant?: AppTextVariant;
    tone?: AppTextTone;
    align?: TextStyle["textAlign"];
  }
>;

function resolveTone(tone: AppTextTone | undefined) {
  switch (tone) {
    case "inverse":
      return colors.surface;
    case "accent":
      return colors.accentStrong;
    case "danger":
      return colors.danger;
    case "success":
      return colors.success;
    case "tertiary":
      return colors.textTertiary;
    case "secondary":
      return colors.textSecondary;
    case "primary":
    default:
      return colors.textPrimary;
  }
}

export function AppText({ variant = "body", tone = "primary", align, style, children, ...rest }: Props) {
  return (
    <Text
      {...rest}
      style={[
        styles.base,
        variantStyles[variant],
        { color: resolveTone(tone) },
        align ? { textAlign: align } : null,
        style
      ]}
    >
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  base: {
    fontFamily: typography.fontFamily.system
  }
});

const variantStyles = StyleSheet.create<Record<AppTextVariant, TextStyle>>({
  screenTitle: {
    fontSize: typography.size["3xl"],
    fontWeight: typography.weight.semibold,
    lineHeight: typography.lineHeight["3xl"]
  },
  title1: {
    fontSize: typography.size["3xl"],
    fontWeight: typography.weight.bold,
    lineHeight: typography.lineHeight["3xl"]
  },
  title2: {
    fontSize: typography.size["2xl"],
    fontWeight: typography.weight.semibold,
    lineHeight: typography.lineHeight["2xl"]
  },
  headline: {
    fontSize: typography.size.xl,
    fontWeight: typography.weight.semibold,
    lineHeight: typography.lineHeight.xl
  },
  cardTitle: {
    fontSize: typography.size.xl,
    fontWeight: typography.weight.semibold,
    lineHeight: typography.lineHeight.xl
  },
  body: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.semibold,
    lineHeight: typography.lineHeight.lg
  },
  bodyStrong: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
    lineHeight: typography.lineHeight.lg
  },
  meta: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
    lineHeight: typography.lineHeight.md
  },
  caption: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.medium,
    lineHeight: typography.lineHeight.sm
  },
  sectionLabel: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.medium,
    letterSpacing: 0.2
  },
  error: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
    lineHeight: typography.lineHeight.md
  },
  label: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    letterSpacing: 0.6,
    textTransform: "uppercase"
  },
  overline: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.bold,
    letterSpacing: 0.9,
    textTransform: "uppercase"
  }
});

