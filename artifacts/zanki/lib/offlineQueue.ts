import AsyncStorage from "@react-native-async-storage/async-storage";
import type { UserCard } from "@/types";

export interface PendingCardSession {
  lectureId: string;
  lectureName: string;
  userId: string;
  totalCards: number;
  againCount: number;
  hardCount: number;
  goodCount: number;
  masteryRate: number;
  createdAt: string;
  userCards?: Partial<UserCard>[];
}

const QUEUE_KEY = "zanki:card_queue";

/**
 * Add a completed card session to the offline queue.
 * It will be synced to Supabase when connectivity returns.
 */
export async function enqueueCardSession(
  session: PendingCardSession,
): Promise<void> {
  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  const queue: PendingCardSession[] = raw ? JSON.parse(raw) : [];
  queue.push(session);
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

/** Get all pending sessions waiting to sync. */
export async function getPendingCardSessions(): Promise<PendingCardSession[]> {
  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  return raw ? JSON.parse(raw) : [];
}

/** Remove a synced session from the queue by matching its createdAt timestamp. */
export async function removePendingCardSession(
  createdAt: string,
): Promise<void> {
  const queue = await getPendingCardSessions();
  const filtered = queue.filter((s) => s.createdAt !== createdAt);
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(filtered));
}

/** Clear the entire offline queue (e.g. on sign-out). */
export async function clearPendingQueue(): Promise<void> {
  await AsyncStorage.removeItem(QUEUE_KEY);
}

/** Get the count of pending sessions. */
export async function getPendingCount(): Promise<number> {
  const queue = await getPendingCardSessions();
  return queue.length;
}
