import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";
import { getCardsFromCache, saveCardsToCache } from "@/lib/cardCache";
import type { Flashcard } from "@/types";

/**
 * Fetch flashcards for a lecture from Supabase.
 * Cards are sorted by card_order (ascending) so students study the lecture
 * sequentially from A to Z — no shuffling.
 */
async function fetchCards(lectureId: string): Promise<Flashcard[]> {
  const { data, error } = await supabase
    .from("flashcards")
    .select("id, lecture_id, front, back, image_url, hint, tags, card_order")
    .eq("lecture_id", lectureId)
    .order("card_order", { ascending: true });

  if (error) throw new Error(error.message);
  if (!data || data.length === 0) return [];

  // Ensure cards are in order (already ordered by query, but guarantee)
  const sorted = [...data].sort((a, b) => (a.card_order ?? 0) - (b.card_order ?? 0));

  return sorted as Flashcard[];
}

/**
 * React Query hook for flashcards, with offline-first support.
 *
 * Strategy:
 *  1. Try cache first — return instantly if available
 *  2. Fetch from Supabase in background
 *  3. On success, update cache for next offline session
 */
export function useFlashcards(lectureId: string | undefined) {
  return useQuery<Flashcard[]>({
    queryKey: ["flashcards", lectureId],
    queryFn: async () => {
      if (!lectureId) return [];

      // Try cache first
      const cached = await getCardsFromCache(lectureId);

      try {
        const fresh = await fetchCards(lectureId);
        // Update cache with fresh data
        if (fresh.length > 0) {
          await saveCardsToCache(lectureId, fresh);
        }
        return fresh;
      } catch (fetchError) {
        // If network fails but we have cache, return cache
        if (cached && cached.length > 0) return cached;
        throw fetchError;
      }
    },
    enabled: !!lectureId,
    staleTime: 5 * 60 * 1000, // 5 min
    networkMode: "offlineFirst",
  });
}

export { fetchCards };
