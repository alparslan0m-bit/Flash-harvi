import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

import { supabase } from "@/lib/supabase";
import {
  getPendingCardSessions,
  removePendingCardSession,
  getPendingCount,
} from "@/lib/offlineQueue";
import type { PendingCardSession } from "@/lib/offlineQueue";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";

interface SyncContextValue {
  isOnline: boolean;
  pendingCount: number;
  syncNow: () => Promise<void>;
}

const SyncCtx = createContext<SyncContextValue>({
  isOnline: true,
  pendingCount: 0,
  syncNow: async () => {},
});

export function SyncProvider({ children }: { children: React.ReactNode }) {
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const syncing = useRef(false);
  const queryClient = useQueryClient();
  const { user } = useAuth();

  /** Refresh the pending count from the queue. */
  const refreshCount = useCallback(async () => {
    const count = await getPendingCount();
    setPendingCount(count);
  }, []);

  /** Attempt to sync all pending card sessions to Supabase. */
  const syncNow = useCallback(async () => {
    if (syncing.current) return;
    syncing.current = true;

    try {
      const pending = await getPendingCardSessions();
      if (pending.length === 0) {
        syncing.current = false;
        return;
      }

      for (const session of pending) {
        try {
          const { error } = await supabase.from("card_sessions").insert({
            user_id: session.userId,
            lecture_id: session.lectureId,
            lecture_name: session.lectureName,
            total_cards: session.totalCards,
            again_count: session.againCount,
            hard_count: session.hardCount,
            good_count: session.goodCount,
            mastery_rate: session.masteryRate,
            created_at: session.createdAt,
          });

          if (!error) {
            await removePendingCardSession(session.createdAt);
            setIsOnline(true);
            if (user?.id) {
              queryClient.invalidateQueries({ queryKey: ["stats", user.id] });
              queryClient.invalidateQueries({ queryKey: ["progress", user.id] });
            }
          } else {
            setIsOnline(false);
            break; // Stop trying if we get an error
          }
        } catch {
          setIsOnline(false);
          break;
        }
      }

      await refreshCount();
    } finally {
      syncing.current = false;
    }
  }, [refreshCount]);

  // On mount and every 30s, try to sync
  useEffect(() => {
    refreshCount();

    const interval = setInterval(() => {
      syncNow();
    }, 30_000);

    // Initial sync attempt
    syncNow();

    return () => clearInterval(interval);
  }, [syncNow, refreshCount]);

  return (
    <SyncCtx.Provider value={{ isOnline, pendingCount, syncNow }}>
      {children}
    </SyncCtx.Provider>
  );
}

export function useSyncStatus() {
  return useContext(SyncCtx);
}
