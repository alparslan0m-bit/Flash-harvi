import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { useStats } from "@/hooks/useStats";

type FilterKey = "all" | "strong" | "improving" | "weak";

const FILTERS: { key: FilterKey; label: string; icon: string }[] = [
  { key: "all",       label: "All",        icon: "layers" },
  { key: "strong",    label: "Strong",     icon: "trending-up" },
  { key: "improving", label: "Improving",  icon: "activity" },
  { key: "weak",      label: "Needs Work", icon: "alert-circle" },
];

function masteryTier(m: number): FilterKey {
  if (m >= 80) return "strong";
  if (m >= 50) return "improving";
  return "weak";
}

function masteryColor(m: number, colors: ReturnType<typeof useColors>) {
  if (m >= 80) return colors.success;
  if (m >= 50) return colors.warning;
  return colors.destructive;
}

function masteryBg(m: number, colors: ReturnType<typeof useColors>) {
  if (m >= 80) return colors.success + "1A";
  if (m >= 50) return colors.warning + "1A";
  return colors.destructive + "1A";
}

// ── Animated progress bar ────────────────────────────────────────────────────
function ProgressBar({ mastery, color, delay = 0 }: { mastery: number; color: string; delay?: number }) {
  const width = useSharedValue(0);
  React.useEffect(() => {
    width.value = withDelay(delay, withTiming(mastery, { duration: 700 }));
  }, [mastery, delay]);
  const animStyle = useAnimatedStyle(() => ({ width: `${width.value}%` as `${number}%` }));
  return (
    <View style={barStyles.track}>
      <Animated.View style={[barStyles.fill, { backgroundColor: color }, animStyle]} />
    </View>
  );
}

const barStyles = StyleSheet.create({
  track: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(0,0,0,0.05)",
    overflow: "hidden",
  },
  fill: { height: "100%", borderRadius: 3 },
});

// ── Summary pill ─────────────────────────────────────────────────────────────
function SummaryPill({
  count, label, bg, textColor,
}: { count: number; label: string; bg: string; textColor: string }) {
  return (
    <View style={[pillStyles.pill, { backgroundColor: bg }]}>
      <Text style={[pillStyles.count, { color: textColor }]}>{count}</Text>
      <Text style={[pillStyles.label, { color: textColor }]}>{label}</Text>
    </View>
  );
}
const pillStyles = StyleSheet.create({
  pill: { flex: 1, alignItems: "center", paddingVertical: 12, borderRadius: 16, gap: 2 },
  count: { fontSize: 22, fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  label: { fontSize: 11, fontFamily: "Inter_500Medium" },
});

// ── Lecture card ─────────────────────────────────────────────────────────────
function LectureCard({
  subject, mastery, rank, colors,
}: { subject: string; mastery: number; rank: number; colors: ReturnType<typeof useColors> }) {
  const color = masteryColor(mastery, colors);
  const bg    = masteryBg(mastery, colors);

  return (
    <View style={[
      cardStyles.card, 
      { 
        backgroundColor: colors.card, 
        borderColor: color + "33"
      }
    ]}>
      <View style={[cardStyles.accent, { backgroundColor: color }]} />
      <View style={cardStyles.body}>
        <View style={cardStyles.topRow}>
          <View style={[cardStyles.rankBadge, { backgroundColor: colors.muted }]}>
            <Text style={[cardStyles.rankText, { color: colors.mutedForeground }]}>{rank}</Text>
          </View>
          <Text style={[cardStyles.name, { color: colors.foreground }]} numberOfLines={2}>
            {subject}
          </Text>
          <View style={[cardStyles.badge, { backgroundColor: bg }]}>
            <Text style={[cardStyles.badgeText, { color }]}>{mastery}%</Text>
          </View>
        </View>
        <View style={cardStyles.barRow}>
          <ProgressBar mastery={mastery} color={color} delay={rank * 40} />
          <Text style={[cardStyles.tierLabel, { color }]}>
            {mastery >= 80 ? "Strong" : mastery >= 50 ? "Improving" : "Needs Work"}
          </Text>
        </View>
      </View>
    </View>
  );
}

const cardStyles = StyleSheet.create({
  card: {
    flexDirection: "row",
    borderRadius: 20,
    borderWidth: 1.5,
    marginBottom: 12,
    overflow: "hidden",
  },
  accent: { width: 4 },
  body: { flex: 1, paddingHorizontal: 16, paddingVertical: 16, gap: 12 },
  topRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  rankBadge: {
    width: 24,
    height: 24,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  rankText: { fontSize: 11, fontFamily: "Inter_700Bold" },
  name: { flex: 1, fontSize: 15, fontFamily: "Inter_600SemiBold", lineHeight: 21 },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    alignSelf: "flex-start",
  },
  badgeText: { fontSize: 13, fontFamily: "Inter_700Bold" },
  barRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  tierLabel: { fontSize: 11, fontFamily: "Inter_500Medium", minWidth: 70, textAlign: "right" },
});

// ── Main screen ───────────────────────────────────────────────────────────────
export default function MasteryScreen() {
  const colors  = useColors();
  const insets  = useSafeAreaInsets();
  const { user } = useAuth();
  const { data: stats } = useStats(user?.id);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);

  const all = stats?.subject_mastery ?? [];

  const counts = useMemo(() => ({
    strong:    all.filter((i) => i.mastery >= 80).length,
    improving: all.filter((i) => i.mastery >= 50 && i.mastery < 80).length,
    weak:      all.filter((i) => i.mastery < 50).length,
  }), [all]);

  const overallAvg = all.length
    ? Math.round(all.reduce((s, i) => s + i.mastery, 0) / all.length)
    : 0;

  const items = useMemo(() => {
    return all.filter((item) => {
      const matchSearch = search === "" || item.subject.toLowerCase().includes(search.toLowerCase());
      const matchFilter = filter === "all" || masteryTier(item.mastery) === filter;
      return matchSearch && matchFilter;
    });
  }, [all, search, filter]);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <View style={[styles.header, { paddingTop: topPad + 12, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Lecture Mastery</Text>
          <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>
            {all.length} lecture{all.length !== 1 ? "s" : ""} tracked
          </Text>
        </View>
        <View style={[styles.avgBadge, { backgroundColor: colors.primary + "1A" }]}>
          <Text style={[styles.avgLabel, { color: colors.primary }]}>Avg</Text>
          <Text style={[styles.avgValue, { color: colors.primary }]}>{overallAvg}%</Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
      >
        {/* ── Summary pills ───────────────────────────────────────────── */}
        {all.length > 0 && (
          <View style={styles.pillRow}>
            <SummaryPill count={counts.strong}    label="Strong"    bg={colors.success + "1A"} textColor={colors.success} />
            <SummaryPill count={counts.improving} label="Improving" bg={colors.warning + "1A"} textColor={colors.warning} />
            <SummaryPill count={counts.weak}      label="Needs Work" bg={colors.destructive + "1A"} textColor={colors.destructive} />
          </View>
        )}

        {/* ── Search ──────────────────────────────────────────────────── */}
        <View style={[styles.searchWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="search" size={16} color={colors.mutedForeground} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground }]}
            placeholder="Search lectures…"
            placeholderTextColor={colors.mutedForeground}
            value={search}
            onChangeText={setSearch}
            clearButtonMode="while-editing"
            returnKeyType="search"
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch("")} hitSlop={8}>
              <Feather name="x-circle" size={15} color={colors.mutedForeground} />
            </Pressable>
          )}
        </View>

        {/* ── Filter chips ────────────────────────────────────────────── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
        >
          {FILTERS.map((f) => {
            const active = filter === f.key;
            const cnt =
              f.key === "all" ? all.length :
              f.key === "strong" ? counts.strong :
              f.key === "improving" ? counts.improving :
              counts.weak;
            return (
              <Pressable
                key={f.key}
                onPress={() => setFilter(f.key)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: active ? colors.primary : colors.background,
                    borderColor:     active ? colors.primary : colors.border,
                  },
                ]}
              >
                <Feather
                  name={f.icon as any}
                  size={12}
                  color={active ? "#fff" : colors.mutedForeground}
                />
                <Text style={[styles.chipText, { color: active ? "#fff" : colors.mutedForeground }]}>
                  {f.label}
                </Text>
                <View style={[styles.chipCount, { backgroundColor: active ? "rgba(255,255,255,0.25)" : colors.muted }]}>
                  <Text style={[styles.chipCountText, { color: active ? "#fff" : colors.mutedForeground }]}>
                    {cnt}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* ── Cards ───────────────────────────────────────────────────── */}
        <View style={styles.list}>
          {items.length === 0 ? (
            <View style={styles.empty}>
              <View style={[styles.emptyIcon, { backgroundColor: colors.muted }]}>
                <Feather name="inbox" size={28} color={colors.mutedForeground} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Nothing here</Text>
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                {search ? `No lectures match "${search}"` : "No lectures in this category yet."}
              </Text>
            </View>
          ) : (
            items.map((item, i) => (
              <LectureCard
                key={i}
                subject={item.subject}
                mastery={item.mastery}
                rank={i + 1}
                colors={colors}
              />
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 12,
    borderBottomWidth: 1,
  },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 26, fontFamily: "Nunito_800ExtraBold", letterSpacing: -0.5 },
  headerSub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 1 },
  avgBadge: {
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    gap: 1,
  },
  avgLabel: { fontSize: 10, fontFamily: "Inter_500Medium", textTransform: "uppercase", letterSpacing: 0.5 },
  avgValue: { fontSize: 20, fontFamily: "Inter_700Bold", letterSpacing: -0.5 },

  pillRow: { flexDirection: "row", gap: 10, marginHorizontal: 20, marginTop: 20, marginBottom: 4 },

  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 16,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    padding: 0,
  },

  chipRow: { paddingHorizontal: 20, gap: 8, marginBottom: 16 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  chipCount: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  chipCountText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },

  list: { paddingHorizontal: 20 },

  empty: { alignItems: "center", paddingTop: 60, gap: 10 },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  emptyTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  emptyText: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20, maxWidth: 240 },
});
