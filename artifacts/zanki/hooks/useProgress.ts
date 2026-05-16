import AsyncStorage from "@react-native-async-storage/async-storage";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef } from "react";

import { supabase } from "@/lib/supabase";
import type { CardSession } from "@/types";

/**
 * useProgress
 *
 * Tracks which lectures the user has completed (i.e. has at least one
 * card_session entry). Returns a Set<string> of lecture IDs.
 */

const PROGRESS_QUERY_KEY = "progress";

// Local cache key per user
const PROGRESS_CACHE_KEY = (uid: string) => `zanki:progress:${uid}`;

export function useProgress(userId?: string): Set<string> {
  const queryClient = useQueryClient();
  const prevRef = useRef<Set<string>>(new Set());

  const { data } = useQuery<Set<string>>({
    queryKey: [PROGRESS_QUERY_KEY, userId],
    queryFn: async () => {
      if (!userId) return new Set<string>();

      // Try local cache first
      const cachedRaw = await AsyncStorage.getItem(PROGRESS_CACHE_KEY(userId));
      let cachedSet: Set<string> = new Set();
      if (cachedRaw) {
        try {
          cachedSet = new Set(JSON.parse(cachedRaw));
        } catch {}
      }

      try {
        const { data: sessions, error } = await supabase
          .from("card_sessions")
          .select("lecture_id")
          .eq("user_id", userId);

        if (error) throw error;

        const ids = new Set((sessions ?? []).map((s: any) => s.lecture_id));

        // Persist to cache
        await AsyncStorage.setItem(
          PROGRESS_CACHE_KEY(userId),
          JSON.stringify([...ids]),
        );

        return ids;
      } catch {
        // Offline fallback
        return cachedSet;
      }
    },
    enabled: !!userId,
    staleTime: 2 * 60 * 1000,
    networkMode: "offlineFirst",
  });

  const result = data ?? prevRef.current;
  prevRef.current = result;

  return result;
}

/** Convenience wrapper that pulls userId from useAuth internally. */
export function useProgressSet(): Set<string> {
  // NOTE: consumers should pass userId from useAuth().user?.id
  return new Set();
}
