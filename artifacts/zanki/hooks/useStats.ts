import AsyncStorage from "@react-native-async-storage/async-storage";
import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";
import type { CardSession, SubjectMastery, UserStats, WeeklyDay } from "@/types";

const CACHE_KEY = (uid: string) => `zanki:stats:${uid}`;

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export const ZERO_STATS: UserStats = {
  total_sessions: 0,
  total_cards: 0,
  average_mastery: 0,
  streak: 0,
  weekly_activity: [],
  srs_distribution: [],
  total_xp: 0,
  level: 1,
};

/**
 * Compute stats from raw card_sessions and user_cards rows.
 */
function computeStats(sessions: any[], userCards: any[]): UserStats {
  const sortedSessions = [...sessions].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );


  // ── Streak ─────────────────────────────────────────────────────────────
  let streak = 0;
  const uniqueDays = new Set(
    sortedSessions.map((r) => new Date(r.created_at).toDateString()),
  );
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const checkDay = new Date(today);
  if (!uniqueDays.has(checkDay.toDateString())) {
    checkDay.setDate(checkDay.getDate() - 1);
  }
  while (uniqueDays.has(checkDay.toDateString())) {
    streak++;
    checkDay.setDate(checkDay.getDate() - 1);
  }


  // ── SRS Distribution ───────────────────────────────────────────────────
  const srs = {
    new: 0,
    learning: 0,
    review: 0,
    mastered: 0,
  };

  for (const uc of userCards) {
    if (uc.repetition === 0) srs.new++;
    else if (uc.interval < 21) srs.learning++;
    else if (uc.interval < 100) srs.review++;
    else srs.mastered++;
  }

  const totalUc = userCards.length || 1;
  const srs_distribution: SrsLevel[] = [
    { label: "New", count: srs.new, color: "#94a3b8", percentage: (srs.new / totalUc) * 100 },
    { label: "Learning", count: srs.learning, color: "#3b82f6", percentage: (srs.learning / totalUc) * 100 },
    { label: "Review", count: srs.review, color: "#f59e0b", percentage: (srs.review / totalUc) * 100 },
    { label: "Mastered", count: srs.mastered, color: "#10b981", percentage: (srs.mastered / totalUc) * 100 },
  ];  // ── Weekly activity (Last 7 Days) ──────────────────────────────────────
  const weekActivity = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    d.setHours(0, 0, 0, 0);
    return d;
  });

  const dailyCounts: WeeklyDay[] = weekActivity.map((date) => {
    const count = sortedSessions.filter((s) => {
      const sd = new Date(s.created_at);
      sd.setHours(0, 0, 0, 0);
      return sd.getTime() === date.getTime();
    }).length;
    
    return {
      date: date.toISOString(),
      label: DAYS[date.getDay()],
      count,
      isToday: date.getTime() === new Date().setHours(0, 0, 0, 0),
    };
  });

  const totalXp = sortedSessions.reduce(
    (s, r) => s + (r.hard_count ?? 0) * 5 + (r.good_count ?? 0) * 10,
    0
  );
  const level = Math.floor(totalXp / 100) + 1;

  return {
    streak,
    weekly_activity: dailyCounts,
    srs_distribution,
    total_xp: totalXp,
    level: level,
  };
}

export function useStats(userId: string | undefined) {
  return useQuery<UserStats>({
    queryKey: ["stats", userId],
    queryFn: async () => {
      if (!userId) return ZERO_STATS;

      const cachedRaw = await AsyncStorage.getItem(CACHE_KEY(userId));
      let cached: UserStats | null = null;
      if (cachedRaw) {
        try {
          cached = JSON.parse(cachedRaw);
        } catch {}
      }

      try {
        const [sessionsRes, userCardsRes] = await Promise.all([
          supabase
            .from("card_sessions")
            .select("*")
            .eq("user_id", userId)
            .order("created_at", { ascending: false })
            .limit(500),
          supabase
            .from("user_cards")
            .select("interval, repetition, next_review")
            .eq("user_id", userId)
        ]);

        if (sessionsRes.error) throw sessionsRes.error;
        if (userCardsRes.error) throw userCardsRes.error;

        const stats = computeStats(sessionsRes.data ?? [], userCardsRes.data ?? []);

        await AsyncStorage.setItem(CACHE_KEY(userId), JSON.stringify(stats));

        return stats;
      } catch (err) {
        console.error("useStats error:", err);
        return cached ?? ZERO_STATS;
      }
    },
    enabled: !!userId,
    staleTime: 2 * 60 * 1000,
    networkMode: "offlineFirst",
  });
}

export async function clearStatsCache(userId: string) {
  await AsyncStorage.removeItem(CACHE_KEY(userId));
}
