import { StyleSheet, View } from "react-native";
import { Card } from "./Card";
import { AppText } from "./AppText";
import { PrimaryButton } from "./PrimaryButton";
import { spacing } from "../theme/tokens";

export function EmptyState(props: {
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <Card variant="muted">
      <View style={styles.content}>
        <AppText variant="cardTitle">{props.title}</AppText>
        {props.message ? (
          <AppText tone="secondary">{props.message}</AppText>
        ) : null}
        {props.actionLabel && props.onAction ? (
          <PrimaryButton label={props.actionLabel} onPress={props.onAction} variant="secondary" />
        ) : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.sm
  }
});

