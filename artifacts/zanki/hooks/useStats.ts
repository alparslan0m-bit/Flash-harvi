import AsyncStorage from "@react-native-async-storage/async-storage";
import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";
import type { CardSession, SubjectMastery, UserStats, WeeklyDay } from "@/types";

const CACHE_KEY = (uid: string) => `zanki:stats:${uid}`;

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const ZERO_STATS: UserStats = {
  total_sessions: 0,
  total_cards: 0,
  average_mastery: 0,
  best_mastery: 0,
  streak: 0,
  weekly_activity: DAYS.map((day, i) => ({
    day,
    count: 0,
    isToday: i === new Date().getDay(),
  })),
  subject_mastery: [],
  recent_results: [],
};

/**
 * Compute stats from raw card_sessions rows.
 */
function computeStats(sessions: any[]): UserStats {
  if (!sessions || sessions.length === 0) return { ...ZERO_STATS };

  // Sort newest first
  const sorted = [...sessions].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );

  const totalSessions = sorted.length;
  const totalCards = sorted.reduce((s, r) => s + (r.total_cards ?? 0), 0);
  const avgMastery =
    totalSessions > 0
      ? sorted.reduce((s, r) => s + (r.mastery_rate ?? 0), 0) / totalSessions
      : 0;
  const bestMastery = Math.max(...sorted.map((r) => r.mastery_rate ?? 0), 0);

  // ── Streak ─────────────────────────────────────────────────────────────
  let streak = 0;
  const uniqueDays = new Set(
    sorted.map((r) => new Date(r.created_at).toDateString()),
  );
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const checkDay = new Date(today);
  // Check if there's a session today
  if (!uniqueDays.has(checkDay.toDateString())) {
    // Allow gap of one day (yesterday counts)
    checkDay.setDate(checkDay.getDate() - 1);
  }
  while (uniqueDays.has(checkDay.toDateString())) {
    streak++;
    checkDay.setDate(checkDay.getDate() - 1);
  }

  // ── Weekly activity ────────────────────────────────────────────────────
  const todayDow = new Date().getDay();
  const weekCounts = new Array(7).fill(0);
  const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  for (const s of sorted) {
    const d = new Date(s.created_at);
    if (d.getTime() >= oneWeekAgo) {
      weekCounts[d.getDay()]++;
    }
  }
  const weeklyActivity: WeeklyDay[] = DAYS.map((day, i) => ({
    day,
    count: weekCounts[i],
    isToday: i === todayDow,
  }));

  // ── Subject mastery ────────────────────────────────────────────────────
  const subjectMap: Record<string, { total: number; sum: number }> = {};
  for (const s of sorted) {
    const name = s.lecture_name || "Unknown";
    if (!subjectMap[name]) subjectMap[name] = { total: 0, sum: 0 };
    subjectMap[name].total++;
    subjectMap[name].sum += s.mastery_rate ?? 0;
  }
  const subjectMastery: SubjectMastery[] = Object.entries(subjectMap)
    .map(([subject, { total, sum }]) => ({
      subject,
      mastery: Math.round(sum / total),
    }))
    .sort((a, b) => b.mastery - a.mastery);

  // ── Recent results ─────────────────────────────────────────────────────
  const recentResults: CardSession[] = sorted.slice(0, 20).map((s) => ({
    id: s.id,
    user_id: s.user_id,
    lecture_id: s.lecture_id,
    lecture_name: s.lecture_name,
    total_cards: s.total_cards,
    again_count: s.again_count ?? 0,
    hard_count: s.hard_count ?? 0,
    good_count: s.good_count ?? 0,
    mastery_rate: s.mastery_rate ?? 0,
    created_at: s.created_at,
  }));

  return {
    total_sessions: totalSessions,
    total_cards: totalCards,
    average_mastery: avgMastery,
    best_mastery: bestMastery,
    streak,
    weekly_activity: weeklyActivity,
    subject_mastery: subjectMastery,
    recent_results: recentResults,
  };
}

export function useStats(userId: string | undefined) {
  return useQuery<UserStats>({
    queryKey: ["stats", userId],
    queryFn: async () => {
      if (!userId) return ZERO_STATS;

      // Try local cache
      const cachedRaw = await AsyncStorage.getItem(CACHE_KEY(userId));
      let cached: UserStats | null = null;
      if (cachedRaw) {
        try {
          cached = JSON.parse(cachedRaw);
        } catch {}
      }

      try {
        const { data: sessions, error } = await supabase
          .from("card_sessions")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(500);

        if (error) throw error;

        const stats = computeStats(sessions ?? []);

        // Persist
        await AsyncStorage.setItem(CACHE_KEY(userId), JSON.stringify(stats));

        return stats;
      } catch {
        return cached ?? ZERO_STATS;
      }
    },
    enabled: !!userId,
    staleTime: 2 * 60 * 1000,
    networkMode: "offlineFirst",
  });
}
