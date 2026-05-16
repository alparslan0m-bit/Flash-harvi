import { Feather } from "@expo/vector-icons";
import { useScrollToTop } from "@react-navigation/native";
import { router } from "expo-router";
import React, { useRef } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Animated,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  StreakCard,
  SrsDistributionCard,
  WeeklyActivityCard,
  LevelProgressCard,
} from "@/components";

import { useAuth } from "@/context/AuthContext";
import { useSyncStatus } from "@/context/SyncContext";
import { useColors } from "@/hooks/useColors";
import { useStats, ZERO_STATS } from "@/hooks/useStats";
import { useScreenAnimation } from "@/hooks/useScreenAnimation";

/**
 * StatsScreen - Rebuilt for professional flashcard application standards.
 */
export default function StatsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { data: stats, isLoading, error } = useStats(user?.id);
  const { isOnline, pendingCount } = useSyncStatus();

  const scrollRef = useRef<ScrollView>(null);
  useScrollToTop(scrollRef);

  const { fadeAnim, translateY } = useScreenAnimation(scrollRef);
  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);

  const displayStats = stats ?? ZERO_STATS;
  const isEmpty =
    displayStats.total_sessions === 0 &&
    displayStats.srs_distribution.length === 0;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* --- Header --- */}
      <View
        style={[
          styles.header,
          {
            paddingTop: topPad + 14,
            backgroundColor: colors.background,
          },
        ]}
      >
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: colors.foreground }]}>
            Performance
          </Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            Insights & SRS Progress
          </Text>
        </View>
        {!isOnline && (
          <View
            style={[
              styles.cachePill,
              { backgroundColor: colors.warning + "1A" },
            ]}
          >
            <Feather name="wifi-off" size={12} color={colors.warning} />
            <Text style={[styles.cacheText, { color: colors.warning }]}>
              Offline
            </Text>
          </View>
        )}
      </View>

      <Animated.View
        style={{ flex: 1, opacity: fadeAnim, transform: [{ translateY }] }}
      >
        {isLoading && (
          <View style={styles.center}>
            <ActivityIndicator color={colors.primary} size="large" />
          </View>
        )}

        {!isLoading && error && (
          <ErrorMessage message={(error as Error).message} />
        )}

        {!isLoading && !error && (
          <ScrollView
            ref={scrollRef}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[
              styles.content,
              { paddingBottom: insets.bottom + 100 },
            ]}
          >
            {/* 1. Level & XP Progress */}
            <LevelProgressCard 
              level={displayStats.level} 
              totalXp={displayStats.total_xp} 
            />

            {/* 2. Streak */}
            <StreakCard streak={displayStats.streak} />

            {/* 2. Weekly Activity */}
            <WeeklyActivityCard data={displayStats.weekly_activity} />

            {/* 3. SRS Distribution */}
            <SrsDistributionCard data={displayStats.srs_distribution} />

            {/* Empty state nudge */}
            {isEmpty && <EmptyNudge />}
          </ScrollView>
        )}
      </Animated.View>
    </View>
  );
}

/**
 * Sub-components
 */

function ErrorMessage({ message }: { message: string }) {
  const colors = useColors();
  return (
    <View style={styles.center}>
      <Feather name="alert-circle" size={40} color={colors.mutedForeground} />
      <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
        Couldn't load stats
      </Text>
      <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
        {message}
      </Text>
    </View>
  );
}

function EmptyNudge() {
  const colors = useColors();
  return (
    <View
      style={[
        styles.nudgeCard,
        {
          backgroundColor: colors.primary + "12",
          borderColor: colors.primary + "33",
        },
      ]}
    >
      <View
        style={[styles.nudgeIcon, { backgroundColor: colors.primary + "20" }]}
      >
        <Feather name="bar-chart-2" size={24} color={colors.primary} />
      </View>
      <Text style={[styles.nudgeTitle, { color: colors.foreground }]}>
        No stats yet
      </Text>
      <Text style={[styles.nudgeText, { color: colors.mutedForeground }]}>
        Complete your first flashcard session to start tracking your performance
        and progress.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    flexDirection: "row",
    alignItems: "flex-end",
  },
  title: {
    fontSize: 34,
    fontFamily: "Nunito_800ExtraBold",
    letterSpacing: -0.5,
  },
  subtitle: { fontSize: 15, fontFamily: "Inter_400Regular", marginTop: -2 },
  cachePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: "center",
  },
  cacheText: { fontSize: 11, fontFamily: "Inter_700Bold" },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 40,
  },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold" },
  emptyText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 20,
  },
  content: { paddingTop: 12 },
  section: {
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 20,
    borderRadius: 24,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
  },
  sectionTitleRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  sectionIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: "Nunito_800ExtraBold",
    letterSpacing: -0.4,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 0,
  },
  seeAll: { flexDirection: "row", alignItems: "center", gap: 2 },
  seeAllText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  weekTotal: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  recentSection: { paddingHorizontal: 20, marginBottom: 16 },
  chartRow: {
    flexDirection: "row",
    gap: 12,
  },
  nudgeCard: {
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 24,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: "center",
    gap: 10,
  },
  nudgeIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  nudgeTitle: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.4,
  },
  nudgeText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 20,
  },
});
