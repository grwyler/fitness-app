import type { PropsWithChildren, ReactNode } from "react";
import { Modal, Pressable, StyleSheet, View, type ViewStyle, type StyleProp } from "react-native";
import { colors, elevation, radius, spacing } from "../theme/tokens";
import { AppText } from "./AppText";

type Props = PropsWithChildren<{
  visible: boolean;
  title?: string;
  subtitle?: string;
  onClose: () => void;
  headerRight?: ReactNode;
  maxWidth?: number;
  style?: StyleProp<ViewStyle>;
}>;

export function ModalSheet({ visible, title, subtitle, onClose, headerRight, maxWidth = 620, style, children }: Props) {
  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={onClose}>
      <Pressable accessibilityRole="button" onPress={onClose} style={styles.backdrop}>
        <Pressable
          accessibilityRole="none"
          onPress={() => null}
          style={[styles.sheet, { maxWidth }, style]}
        >
          {(title || subtitle || headerRight) ? (
            <View style={styles.header}>
              <View style={styles.titleGroup}>
                {title ? <AppText variant="title2">{title}</AppText> : null}
                {subtitle ? (
                  <AppText variant="meta" tone="secondary">
                    {subtitle}
                  </AppText>
                ) : null}
              </View>
              {headerRight ? <View>{headerRight}</View> : null}
            </View>
          ) : null}
          {children}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    alignItems: "center",
    backgroundColor: colors.overlay,
    flex: 1,
    justifyContent: "flex-end",
    padding: spacing.md
  },
  sheet: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.lg,
    gap: spacing.md,
    maxHeight: "92%",
    padding: spacing.lg,
    width: "100%",
    ...elevation.md
  },
  header: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between"
  },
  titleGroup: {
    flex: 1,
    gap: spacing.xs
  }
});

