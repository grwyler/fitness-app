import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Screen } from "../components/Screen";
import { Card } from "../components/Card";
import { AppText } from "../components/AppText";
import { Input } from "../components/Input";
import { PrimaryButton } from "../components/PrimaryButton";
import { useAppAuth } from "../core/auth/AuthProvider";
import type { RootStackParamList } from "../core/navigation/navigation-types";
import { colors, spacing } from "../theme/tokens";
import { listAdminUsers, type AdminUserSummary, type AdminUsersMeta } from "../api/admin";

type Props = NativeStackScreenProps<RootStackParamList, "AdminUsers">;

function formatShortDate(value: string) {
  try {
    return new Date(value).toLocaleDateString();
  } catch {
    return value;
  }
}

function formatGoal(value: string | null) {
  if (!value) return "—";
  return value.replace(/_/g, " ");
}

function formatLevel(value: string | null) {
  if (!value) return "—";
  return value.replace(/_/g, " ");
}

function formatUnitSystem(value: string | null) {
  if (!value) return "—";
  return value === "metric" ? "Metric" : "Imperial";
}

export function AdminUsersScreen({ navigation }: Props) {
  const auth = useAppAuth();
  const [users, setUsers] = useState<AdminUserSummary[]>([]);
  const [meta, setMeta] = useState<AdminUsersMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [search, setSearch] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const normalizedSearch = useMemo(() => search.trim(), [search]);

  const loadFirstPage = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);

    try {
      const response = await listAdminUsers({
        limit: 50,
        offset: 0,
        search: normalizedSearch || undefined
      });
      setUsers(response.data);
      setMeta(response.meta);
    } catch (error) {
      console.error("Unable to load admin users", error);
      const message = error instanceof Error ? error.message : "Unable to load users.";
      setErrorMessage(message);
      Alert.alert("Users unavailable", "Registered users could not be loaded from the server.");
    } finally {
      setLoading(false);
    }
  }, [normalizedSearch]);

  const loadNextPage = useCallback(async () => {
    if (!meta?.nextOffset || loadingMore) {
      return;
    }

    setLoadingMore(true);
    setErrorMessage(null);

    try {
      const response = await listAdminUsers({
        limit: meta.limit,
        offset: meta.nextOffset,
        search: normalizedSearch || undefined
      });
      setUsers((current) => [...current, ...response.data]);
      setMeta(response.meta);
    } catch (error) {
      console.error("Unable to load more admin users", error);
      const message = error instanceof Error ? error.message : "Unable to load more users.";
      setErrorMessage(message);
      Alert.alert("Load failed", "More users could not be loaded.");
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, meta?.limit, meta?.nextOffset, normalizedSearch]);

  useEffect(() => {
    void loadFirstPage();
  }, [loadFirstPage]);

  if (!auth.isAdmin) {
    return (
      <Screen>
        <Card variant="default" style={styles.card}>
          <AppText variant="title2">Admin access required</AppText>
          <AppText tone="secondary">This screen is only available to admin users.</AppText>
          <PrimaryButton label="Back" tone="secondary" onPress={() => navigation.goBack()} />
        </Card>
      </Screen>
    );
  }

  return (
    <Screen>
      <Card variant="default" style={styles.card}>
        <AppText variant="title2">Users</AppText>
        <AppText tone="secondary">
          Browse registered accounts. This view is read-only; user actions will be added later.
        </AppText>
        <View style={styles.row}>
          <Input
            label="Search by email"
            autoCapitalize="none"
            value={search}
            onChangeText={setSearch}
          />
          <PrimaryButton
            label="Refresh"
            tone="secondary"
            disabled={loading || loadingMore}
            onPress={() => void loadFirstPage()}
          />
        </View>
      </Card>

      {loading ? (
        <Card variant="default" style={styles.card}>
          <AppText tone="secondary">Loading users…</AppText>
        </Card>
      ) : errorMessage ? (
        <Card variant="default" style={styles.card}>
          <AppText variant="headline">Unable to load users</AppText>
          <AppText tone="secondary">{errorMessage}</AppText>
          <PrimaryButton label="Retry" onPress={() => void loadFirstPage()} />
        </Card>
      ) : users.length === 0 ? (
        <Card variant="default" style={styles.card}>
          <AppText tone="secondary">No users found.</AppText>
        </Card>
      ) : (
        <View style={styles.list}>
          {users.map((user) => (
            <Card key={user.id} variant="default" style={styles.userCard}>
              <View style={styles.userHeader}>
                <View style={styles.userHeaderLeft}>
                  <AppText variant="cardTitle">{user.email}</AppText>
                  <AppText tone="secondary">Joined {formatShortDate(user.createdAt)}</AppText>
                </View>
                <View
                  style={[
                    styles.roleBadge,
                    user.role === "admin" ? styles.roleBadgeAdmin : styles.roleBadgeUser
                  ]}
                >
                  <AppText style={styles.roleBadgeText}>{user.role.toUpperCase()}</AppText>
                </View>
              </View>

              <View style={styles.userDetails}>
                <AppText tone="secondary">Goal: {formatGoal(user.trainingGoal)}</AppText>
                <AppText tone="secondary">Experience: {formatLevel(user.experienceLevel)}</AppText>
                <AppText tone="secondary">Units: {formatUnitSystem(user.unitSystem)}</AppText>
                <AppText tone="secondary">
                  Workouts: {user.workoutCount}
                  {user.lastWorkoutAt ? ` (last ${formatShortDate(user.lastWorkoutAt)})` : ""}
                </AppText>
              </View>
            </Card>
          ))}

          {meta?.nextOffset ? (
            <Card variant="default" style={styles.card}>
              <PrimaryButton
                label={loadingMore ? "Loading…" : "Load more"}
                disabled={loadingMore}
                onPress={() => void loadNextPage()}
              />
            </Card>
          ) : null}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.sm
  },
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    alignItems: "flex-end"
  },
  list: {
    gap: spacing.md
  },
  userCard: {
    gap: spacing.sm
  },
  userHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.md
  },
  userHeaderLeft: {
    flex: 1,
    gap: spacing.xs
  },
  roleBadge: {
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border
  },
  roleBadgeAdmin: {
    backgroundColor: colors.accentStrong
  },
  roleBadgeUser: {
    backgroundColor: colors.surface
  },
  roleBadgeText: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: "700"
  },
  userDetails: {
    gap: spacing.xs
  }
});
