import { StyleSheet, View } from "react-native";
import { PrimaryButton } from "./PrimaryButton";
import { spacing } from "../theme/tokens";
import { AppText } from "./AppText";
import { Card } from "./Card";

export function ErrorState(props: {
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  }) {
  return (
    <Card elevated>
      <View style={styles.content}>
        <AppText variant="headline">{props.title}</AppText>
        <AppText tone="secondary">{props.message}</AppText>
        {props.actionLabel && props.onAction ? (
          <PrimaryButton label={props.actionLabel} onPress={props.onAction} />
        ) : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.md
  }
});
