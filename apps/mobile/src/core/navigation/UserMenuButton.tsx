import { useMemo, useState } from "react";
import { Modal, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { colors, spacing } from "../../theme/tokens";
import { useAppAuth } from "../auth/AuthProvider";
import type { RootStackParamList } from "./navigation-types";

function getInitials(input: string | null) {
  const trimmed = (input ?? "").trim();
  if (!trimmed) return "U";

  const emailLocalPart = trimmed.includes("@") ? trimmed.split("@")[0] ?? trimmed : trimmed;
  const cleaned = emailLocalPart.replace(/[^a-z0-9]+/gi, " ").trim();
  if (!cleaned) return "U";

  const parts = cleaned.split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "U";
  const second = parts.length > 1 ? parts[1]?.[0] : parts[0]?.[1];
  const initials = `${first}${second ?? ""}`.toUpperCase();
  return initials.length > 2 ? initials.slice(0, 2) : initials;
}

export function UserMenuButton() {
  const auth = useAppAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [menuOpen, setMenuOpen] = useState(false);

  const label = useMemo(() => {
    const email = auth.userEmail;
    if (!email) return "Account";
    const local = email.split("@")[0] ?? email;
    return local.length > 0 ? local : email;
  }, [auth.userEmail]);

  const initials = useMemo(() => getInitials(auth.userEmail), [auth.userEmail]);

  return (
    <View>
      <Pressable
        accessibilityLabel="Open account menu"
        accessibilityRole="button"
        onPress={() => setMenuOpen(true)}
        style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
      >
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <Text numberOfLines={1} style={styles.label}>
          {label}
        </Text>
      </Pressable>

      <Modal
        animationType="fade"
        onRequestClose={() => setMenuOpen(false)}
        transparent
        visible={menuOpen}
      >
        <Pressable
          accessibilityLabel="Close account menu"
          onPress={() => setMenuOpen(false)}
          style={styles.overlay}
        >
          <Pressable
            accessibilityLabel="Account menu"
            onPress={(event) => event.stopPropagation()}
            style={styles.menu}
          >
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setMenuOpen(false);
                navigation.navigate("TrainingProfile");
              }}
              style={({ pressed }) => [styles.menuItem, pressed && styles.menuItemPressed]}
            >
              <Text style={styles.menuItemText}>Settings</Text>
            </Pressable>
            {auth.isAdmin ? (
              <>
                <View style={styles.separator} />
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    setMenuOpen(false);
                    navigation.navigate("AdminDashboard");
                  }}
                  style={({ pressed }) => [styles.menuItem, pressed && styles.menuItemPressed]}
                >
                  <Text style={styles.menuItemText}>Admin Dashboard</Text>
                </Pressable>
              </>
            ) : null}
            <View style={styles.separator} />
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setMenuOpen(false);
                void auth.signOut();
              }}
              style={({ pressed }) => [styles.menuItem, pressed && styles.menuItemPressed]}
            >
              <Text style={[styles.menuItemText, styles.dangerText]}>Sign out</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface
  },
  buttonPressed: {
    opacity: Platform.OS === "web" ? 0.85 : 0.9
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 999,
    backgroundColor: colors.accentMuted,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border
  },
  avatarText: {
    color: colors.accentStrong,
    fontWeight: "700"
  },
  label: {
    maxWidth: 120,
    color: colors.textPrimary,
    fontWeight: "600"
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.15)",
    justifyContent: "flex-start",
    alignItems: "flex-end",
    paddingTop: 56,
    paddingRight: spacing.md
  },
  menu: {
    width: 200,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden"
  },
  menuItem: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  menuItemPressed: {
    backgroundColor: colors.surfaceMuted
  },
  menuItemText: {
    color: colors.textPrimary,
    fontWeight: "600"
  },
  dangerText: {
    color: colors.danger
  },
  separator: {
    height: 1,
    backgroundColor: colors.border
  }
});
