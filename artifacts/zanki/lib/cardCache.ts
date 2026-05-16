import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Flashcard } from "@/types";

/**
 * Offline card cache for flashcards.
 *
 * Storage layout:
 *   zanki:qcache:{lectureId}  →  CachedLecture JSON
 */

interface CachedLecture {
  cards: Flashcard[];
  cardCount: number;
  cachedAt: number;
}

const KEY = (id: string) => `zanki:qcache:${id}`;

/** Save flashcards for a lecture to local cache. */
export async function saveCardsToCache(
  lectureId: string,
  cards: Flashcard[],
): Promise<void> {
  const payload: CachedLecture = {
    cards,
    cardCount: cards.length,
    cachedAt: Date.now(),
  };
  await AsyncStorage.setItem(KEY(lectureId), JSON.stringify(payload));
}

/** Load cached flashcards (or null if no cache). */
export async function getCardsFromCache(
  lectureId: string,
): Promise<Flashcard[] | null> {
  const raw = await AsyncStorage.getItem(KEY(lectureId));
  if (!raw) return null;
  try {
    const parsed: CachedLecture = JSON.parse(raw);
    return parsed.cards ?? null;
  } catch {
    return null;
  }
}

/** Remove cache for a single lecture. */
export async function clearCardCache(lectureId: string): Promise<void> {
  await AsyncStorage.removeItem(KEY(lectureId));
}

/** Return the cached card count (used for staleness checks). */
export async function getCachedCardCount(
  lectureId: string,
): Promise<number | null> {
  const raw = await AsyncStorage.getItem(KEY(lectureId));
  if (!raw) return null;
  try {
    return (JSON.parse(raw) as CachedLecture).cardCount ?? null;
  } catch {
    return null;
  }
}

/** Remove ALL cached card data (e.g. on sign-out). */
export async function clearAllCardCaches(): Promise<void> {
  const allKeys = await AsyncStorage.getAllKeys();
  const cacheKeys = allKeys.filter((k) => k.startsWith("zanki:qcache:"));
  if (cacheKeys.length) await AsyncStorage.multiRemove(cacheKeys);
}
