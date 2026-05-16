import { Flashcard, UserCard } from "@/types";

export type SessionMode = "study" | "review";

interface SessionOptions {
  mode: SessionMode;
  shuffle?: boolean;
  newCardLimit?: number;
}

/**
 * Filter and sort cards based on the desired session mode.
 */
export function prepareSessionCards(
  allCards: Flashcard[],
  userCards: UserCard[],
  options: SessionOptions
): Flashcard[] {
  const { mode, shuffle = false, newCardLimit = 9999 } = options;
  const now = new Date();

  // Map user cards for easy lookup
  const stateMap = new Map<string, UserCard>();
  userCards.forEach(uc => stateMap.set(uc.card_id, uc));

  if (mode === "review") {
    // Review mode: only due cards + limited new cards
    const dueCards = allCards.filter(card => {
      const state = stateMap.get(card.id);
      if (!state) return false; // New cards handled separately
      return new Date(state.next_review) <= now;
    });

    const newCards = allCards.filter(card => !stateMap.has(card.id)).slice(0, newCardLimit);

    let combined = [...dueCards, ...newCards];

    if (shuffle) {
      combined = combined.sort(() => Math.random() - 0.5);
    }

    return combined;
  } else {
    // Study mode (Lecture): Usually sequential, include all cards
    // Priority: New -> Learning -> Review
    // But for a lecture, sequential is often better for first-time learning.
    
    if (shuffle) {
      return [...allCards].sort(() => Math.random() - 0.5);
    }

    // Default: Sort by original card_order
    return [...allCards].sort((a, b) => (a.card_order ?? 0) - (b.card_order ?? 0));
  }
}
