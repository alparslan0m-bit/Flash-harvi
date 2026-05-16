export type CardGrade = "again" | "hard" | "good" | "easy";

export interface SrsState {
  interval: number; // in days
  repetition: number;
  easeFactor: number;
}

/**
 * SuperMemo-2 (SM-2) algorithm implementation adapted for Anki's 4 buttons.
 * 
 * Grades:
 * - again: Failed, start over.
 * - hard: Struggled, interval grows slightly.
 * - good: Standard successful recall.
 * - easy: Perfect recall, interval grows faster.
 */
export function calculateSM2(grade: CardGrade, currentState?: SrsState): SrsState {
  let interval = currentState?.interval ?? 0;
  let repetition = currentState?.repetition ?? 0;
  let easeFactor = currentState?.easeFactor ?? 2.5;

  let quality = 0;
  if (grade === "again") quality = 0;
  else if (grade === "hard") quality = 3;
  else if (grade === "good") quality = 4;
  else if (grade === "easy") quality = 5;

  if (quality < 3) {
    // Failed recall (Again)
    repetition = 0;
    interval = 1;
  } else {
    // Successful recall
    if (repetition === 0) {
      interval = 1;
    } else if (repetition === 1) {
      interval = 6;
    } else {
      // Modify interval for Hard/Easy
      let modifier = 1;
      if (grade === "hard") modifier = 1.2;
      else if (grade === "easy") modifier = 1.3;
      
      interval = Math.max(
        Math.round(interval * easeFactor * modifier),
        interval + 1 // Ensure interval always grows by at least 1 day
      );
    }
    repetition++;
  }

  // Update ease factor
  easeFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  
  // SM-2 specifies ease factor shouldn't drop below 1.3
  easeFactor = Math.max(1.3, easeFactor);
  
  // Cap at 3.0 to prevent explosive growth
  easeFactor = Math.min(3.0, easeFactor);

  return { interval, repetition, easeFactor };
}

/**
 * Formats a numerical interval (in days) into a human-readable string.
 */
export function formatInterval(days: number): string {
  if (days <= 0) return "<10m";
  if (days === 1) return "1d";
  if (days >= 30) {
    const months = Math.floor(days / 30);
    return `${months}mo`;
  }
  return `${days}d`;
}

/**
 * Calculates the exact Date object for the next review based on the new interval.
 */
export function getNextReviewDate(intervalDays: number): Date {
  const now = new Date();
  if (intervalDays <= 0) {
    // Due immediately (or in 10 minutes realistically, but we use now for simplicity)
    return now;
  }
  now.setDate(now.getDate() + intervalDays);
  return now;
}
