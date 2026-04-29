import type { PropsWithChildren, ReactNode } from "react";
import { SafeAreaView, ScrollView, StyleSheet, View } from "react-native";
import { colors, spacing } from "../theme/tokens";

type Props = PropsWithChildren<{
  fixedFooter?: ReactNode;
  fixedFooterHeight?: number;
}>;

export function Screen({ children, fixedFooter, fixedFooterHeight }: Props) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={[styles.content, fixedFooter ? { paddingBottom: spacing.lg + (fixedFooterHeight ?? 0) } : null]}
      >
        {children}
      </ScrollView>
      {fixedFooter ? <View style={styles.fixedFooter}>{fixedFooter}</View> : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background
  },
  content: {
    padding: spacing.lg,
    gap: spacing.lg
  },
  fixedFooter: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    padding: spacing.lg
  }
});
