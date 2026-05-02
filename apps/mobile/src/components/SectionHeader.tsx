import type { ReactNode } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { AppText } from "./AppText";
import { spacing } from "../theme/tokens";

export function SectionHeader(props: {
  label: string;
  right?: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.row, props.style]}>
      <AppText variant="sectionLabel" tone="secondary">
        {props.label}
      </AppText>
      {props.right ? <View>{props.right}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.xs
  }
});

