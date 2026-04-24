import { SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";
import { colors, spacing } from "../theme/tokens";

const dashboardPreview = {
  programName: "Beginner Full Body V1",
  daysPerWeek: 3,
  nextWorkout: {
    name: "Workout A",
    exerciseCount: 5,
    estimatedDurationMinutes: 60
  }
};

export function DashboardScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <Text style={styles.eyebrow}>Fitness App</Text>
          <Text style={styles.title}>Show up. Follow the plan. Let the system handle the rest.</Text>
          <Text style={styles.subtitle}>
            Phase 1 foundation is wired around the first production slice: start workout, log sets,
            complete workout.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>Next workout</Text>
          <Text style={styles.cardTitle}>{dashboardPreview.nextWorkout.name}</Text>
          <Text style={styles.cardBody}>
            {dashboardPreview.nextWorkout.exerciseCount} exercises • {dashboardPreview.nextWorkout.estimatedDurationMinutes} minutes
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>Program design</Text>
          <Text style={styles.cardTitle}>{dashboardPreview.programName}</Text>
          <Text style={styles.cardBody}>
            {dashboardPreview.daysPerWeek} sessions per week, deterministic progression, low-cognitive-load workout flow.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>Foundation modules</Text>
          <Text style={styles.cardBody}>Shared contracts, Postgres schema, seed definitions, API bootstrap, Expo shell.</Text>
        </View>
      </ScrollView>
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
    gap: spacing.md
  },
  hero: {
    gap: spacing.sm,
    marginBottom: spacing.sm
  },
  eyebrow: {
    color: colors.accentStrong,
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 1.2,
    textTransform: "uppercase"
  },
  title: {
    color: colors.textPrimary,
    fontSize: 34,
    fontWeight: "800",
    lineHeight: 40
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 16,
    lineHeight: 22
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 24,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.lg
  },
  cardLabel: {
    color: colors.accentStrong,
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase"
  },
  cardTitle: {
    color: colors.textPrimary,
    fontSize: 24,
    fontWeight: "700"
  },
  cardBody: {
    color: colors.textSecondary,
    fontSize: 16,
    lineHeight: 22
  }
});
