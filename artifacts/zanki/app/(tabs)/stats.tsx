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
  MasteryBar,
  RecentResultCard,
  StreakCard,
  WeeklyChart,
  StatsMetricsGrid,
} from "@/components";

import { useAuth } from "@/context/AuthContext";
import { useSyncStatus } from "@/context/SyncContext";
import { useColors } from "@/hooks/useColors";
import { useStats } from "@/hooks/useStats";
import { useScreenAnimation } from "@/hooks/useScreenAnimation";

/**
 * StatsScreen - Refactored for modularity and performance.
 */
export default function StatsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { data: stats, isLoading, error } = useStats(user?.id);
  const { isOnline, pendingCount } = useSyncStatus();

  const scrollRef = useRef<ScrollView>(null);
  useScrollToTop(scrollRef);

  // Reusable screen transition animation
  const { fadeAnim, translateY } = useScreenAnimation(scrollRef);

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);

  const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const todayDow = new Date().getDay();
  const ZERO_WEEK = DAYS.map((day, i) => ({
    day,
    count: 0,
    isToday: i === todayDow,
  }));

  const displayStats = stats ?? {
    total_sessions: 0,
    total_cards: 0,
    average_mastery: 0,
    best_mastery: 0,
    streak: 0,
    weekly_activity: ZERO_WEEK,
    subject_mastery: [],
    recent_results: [],
  };

  const weekData = displayStats.weekly_activity?.length
    ? displayStats.weekly_activity
    : ZERO_WEEK;
  const isEmpty = displayStats.total_sessions === 0;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* --- Fixed Header --- */}
      <View
        style={[
          styles.header,
          {
            paddingTop: topPad + 14,
            borderBottomColor: "transparent",
            backgroundColor: colors.background,
          },
        ]}
      >
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: colors.foreground }]}>
            Performance
          </Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            Your learning journey
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
              {pendingCount > 0 ? `${pendingCount} pending` : "Offline"}
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
            {/* Key metrics grid component */}
            <StatsMetricsGrid
              totalSessions={displayStats.total_sessions}
              totalCards={displayStats.total_cards}
              averageMastery={displayStats.average_mastery}
              bestMastery={displayStats.best_mastery}
            />

            <StreakCard streak={displayStats.streak} />

            {/* Weekly activity section */}
            <WeeklyActivitySection weekData={weekData} />

            {/* Lecture mastery section */}
            {displayStats.subject_mastery.length > 0 && (
              <MasterySection masteryData={displayStats.subject_mastery} />
            )}

            {/* Empty state nudge */}
            {isEmpty && <EmptyNudge />}

            {/* Recent results list */}
            {displayStats.recent_results.length > 0 && (
              <RecentResultsSection results={displayStats.recent_results} />
            )}
          </ScrollView>
        )}
      </Animated.View>
    </View>
  );
}

/**
 * Sub-components for cleaner JSX
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

function WeeklyActivitySection({ weekData }: { weekData: any[] }) {
  const colors = useColors();
  const total = weekData.reduce((s, d) => s + d.count, 0);
  return (
    <View
      style={[
        styles.section,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleRow}>
          <View
            style={[
              styles.sectionIcon,
              { backgroundColor: colors.primary + "1A" },
            ]}
          >
            <Feather name="calendar" size={14} color={colors.primary} />
          </View>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            Weekly Activity
          </Text>
        </View>
        <Text style={[styles.weekTotal, { color: colors.mutedForeground }]}>
          {total} session{total !== 1 ? "s" : ""}
        </Text>
      </View>
      <View style={{ marginTop: 24 }}>
        <WeeklyChart data={weekData} />
      </View>
    </View>
  );
}

function MasterySection({ masteryData }: { masteryData: any[] }) {
  const colors = useColors();
  return (
    <View
      style={[
        styles.section,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <Pressable
        style={styles.sectionHeader}
        onPress={() => router.push("/stats/mastery")}
      >
        <View style={styles.sectionTitleRow}>
          <View
            style={[
              styles.sectionIcon,
              { backgroundColor: colors.success + "1A" },
            ]}
          >
            <Feather name="award" size={14} color={colors.success} />
          </View>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            Subject Mastery
          </Text>
        </View>
        <View style={styles.seeAll}>
          <Text style={[styles.seeAllText, { color: colors.primary }]}>
            View All
          </Text>
          <Feather name="chevron-right" size={15} color={colors.primary} />
        </View>
      </Pressable>
      <View style={{ marginTop: 20 }}>
        {masteryData.slice(0, 3).map((item, i) => (
          <MasteryBar key={i} subject={item.subject} mastery={item.mastery} />
        ))}
      </View>
      {masteryData.length > 3 && (
        <Pressable
          style={[
            styles.moreBtn,
            { borderColor: colors.border, backgroundColor: colors.background },
          ]}
          onPress={() => router.push("/stats/mastery")}
        >
          <Text style={[styles.moreBtnText, { color: colors.foreground }]}>
            +{masteryData.length - 3} more subjects
          </Text>
          <Feather name="arrow-right" size={14} color={colors.primary} />
        </Pressable>
      )}
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
        Complete your first flashcard session to start tracking your performance and
        progress.
      </Text>
    </View>
  );
}

function RecentResultsSection({ results }: { results: any[] }) {
  const colors = useColors();
  return (
    <View style={styles.recentSection}>
      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
        Recent Results
      </Text>
      {results.slice(0, 10).map((result, i) => (
        <RecentResultCard key={i} result={result} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    alignItems: "flex-end",
  },
  title: {
    fontSize: 38,
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
  moreBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 12,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  moreBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  weekTotal: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  recentSection: { paddingHorizontal: 20, marginBottom: 16 },
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
