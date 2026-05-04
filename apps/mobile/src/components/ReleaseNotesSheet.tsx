import { ScrollView, StyleSheet, View } from "react-native";
import { ModalSheet } from "./ModalSheet";
import { Button } from "./Button";
import { Card } from "./Card";
import { AppText } from "./AppText";
import { colors, spacing } from "../theme/tokens";
import { releaseNotes, sortReleaseNotesNewestFirst } from "../core/release-notes/release-notes";
import { formatVersionLabel } from "../core/version/version-utils";

export function ReleaseNotesSheet(props: { visible: boolean; onClose: () => void; currentVersion?: string | null }) {
  const sorted = sortReleaseNotesNewestFirst(releaseNotes);
  const currentLabel = props.currentVersion ? formatVersionLabel(props.currentVersion) : null;

  return (
    <ModalSheet
      visible={props.visible}
      title="Release notes"
      subtitle={currentLabel ? `You're on ${currentLabel}` : undefined}
      onClose={props.onClose}
      headerRight={<Button label="Close" variant="ghost" size="sm" onPress={props.onClose} />}
      contentStyle={styles.content}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {sorted.length === 0 ? (
          <AppText tone="secondary">No release notes yet.</AppText>
        ) : (
          sorted.map((entry) => (
            <Card key={entry.version} elevated={false} style={styles.card} contentStyle={styles.cardContent}>
              <View style={styles.releaseHeader}>
                <AppText variant="headline">{formatVersionLabel(entry.version)}</AppText>
                {entry.date ? (
                  <AppText variant="caption" tone="secondary">
                    Released {entry.date}
                  </AppText>
                ) : null}
              </View>

              {entry.sections
                .filter((section) => (section.items ?? []).length > 0)
                .map((section) => (
                  <View key={`${entry.version}:${section.title}`} style={styles.section}>
                    <AppText variant="meta" tone="secondary">
                      {section.title}
                    </AppText>
                    <View style={styles.bullets}>
                      {section.items.map((item, index) => (
                        <AppText key={`${entry.version}:${section.title}:${index}`} style={styles.bullet}>
                          {"\u2022"} {item}
                        </AppText>
                      ))}
                    </View>
                  </View>
                ))}
            </Card>
          ))
        )}
        <View accessibilityElementsHidden style={styles.bottomSpacer} />
      </ScrollView>
    </ModalSheet>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1
  },
  scrollContent: {
    gap: spacing.md,
    paddingBottom: spacing.lg
  },
  card: {
    borderColor: colors.border
  },
  cardContent: {
    gap: spacing.md
  },
  releaseHeader: {
    gap: 2
  },
  section: {
    gap: spacing.xs
  },
  bullets: {
    gap: 6
  },
  bullet: {
    lineHeight: 20
  },
  bottomSpacer: {
    height: 8
  }
});
