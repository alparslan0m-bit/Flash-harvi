import React from "react";
import { View, Text, TouchableOpacity, Alert, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { useColors } from "@/hooks/useColors";
import { clearStatsCache } from "@/hooks/useStats";
import { clearProgressCache } from "@/hooks/useProgress";
import { supabase } from "@/lib/supabase";
import { clearAllCardCaches } from "@/lib/cardCache";
import { clearPendingQueue } from "@/lib/offlineQueue";
import { useTheme } from "@/context/ThemeContext";

interface AccountActionsProps {
  userId?: string;
  onSignOut: () => Promise<void>;
}

/**
 * Component for account-related actions (Clear history, Clear downloads, Sign out).
 * Extracted from ProfileScreen.
 */
export function AccountActions({ userId, onSignOut }: AccountActionsProps) {
  const colors = useColors();
  const { theme, setTheme } = useTheme();

  const queryClient = useQueryClient();

  const handleClearHistory = () => {
    Alert.alert(
      "Clear History",
      "This will delete all your flashcard results. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: async () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

            const uid = userId ?? "";

            // 1. Clear everything locally immediately
            await Promise.all([
              clearStatsCache(uid),
              clearProgressCache(uid),
              clearPendingQueue(),
            ]);

            // 2. Clear remote (will try but might fail if offline)
            try {
              await supabase.from("card_sessions").delete().eq("user_id", uid);
            } catch (error) {
              console.warn(
                "[handleClearHistory] Remote delete failed (possibly offline):",
                error,
              );
            }

            // 3. Force refresh UI
            queryClient.invalidateQueries({ queryKey: ["stats", uid] });
            queryClient.invalidateQueries({ queryKey: ["progress", uid] });

            Alert.alert("History Cleared", "Your flashcard history has been reset.");
          },
        },
      ],
    );
  };

  const handleClearDownloads = () => {
    Alert.alert(
      "Clear Downloads",
      "This will remove all offline-downloaded lectures. You will need to re-download them to review cards offline.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear All",
          style: "destructive",
          onPress: async () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            await clearAllCardCaches();
          },
        },
      ],
    );
  };

  const handleInternalSignOut = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await onSignOut();
    router.replace("/auth");
  };

  return (
    <View style={[styles.card, { backgroundColor: colors.card }]}>
      <View style={styles.header}>
        <View
          style={[
            styles.headerIconWrap,
            { backgroundColor: colors.primary + "1A" },
          ]}
        >
          <Feather name="settings" size={14} color={colors.primary} />
        </View>
        <Text style={[styles.headerLabel, { color: colors.foreground }]}>
          Account
        </Text>
      </View>
      <ActionRow
        icon="trash-2"
        label="Clear Flashcard History"
        onPress={handleClearHistory}
        color={colors.destructive}
        bgColor={colors.destructive + "1A"}
      />

      <View style={[styles.divider, { backgroundColor: colors.border }]} />

      <ActionRow
        icon="download-cloud"
        label="Clear Downloaded Lectures"
        onPress={handleClearDownloads}
        color={colors.warning}
        bgColor={colors.warning + "1A"}
      />

      <View style={[styles.divider, { backgroundColor: colors.border }]} />

      <ActionRow
        icon="log-out"
        label="Sign Out"
        onPress={handleInternalSignOut}
        color={colors.foreground}
        bgColor={colors.muted}
      />
    </View>
  );
}

interface ActionRowProps {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  onPress: () => void;
  color: string;
  bgColor: string;
}

function ActionRow({ icon, label, onPress, color, bgColor }: ActionRowProps) {
  const colors = useColors();
  return (
    <TouchableOpacity
      style={styles.actionRow}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.actionIconWrap, { backgroundColor: bgColor }]}>
        <Feather name={icon} size={15} color={color} />
      </View>
      <Text style={[styles.actionLabel, { color }]}>{label}</Text>
      <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    padding: 20,
    marginBottom: 24,
    gap: 0,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  headerIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  headerLabel: {
    fontSize: 16,
    fontFamily: "Nunito_800ExtraBold",
    letterSpacing: -0.4,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 4,
  },
  actionIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  actionLabel: { flex: 1, fontSize: 15, fontFamily: "Inter_600SemiBold" },
  divider: { height: StyleSheet.hairlineWidth, marginHorizontal: 4 },
});
