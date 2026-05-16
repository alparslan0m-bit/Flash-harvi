// ── Academic hierarchy ──────────────────────────────────────────────────────

export interface Lecture {
  id: string;
  name: string;
  external_id: string;
  order_index?: number;
  card_count?: number;
}

export interface Subject {
  id: string;
  name: string;
  external_id: string;
  order_index?: number;
  is_free?: boolean;
  price_cents?: number;
  external_price_id?: string;
  lectures: Lecture[];
}

export interface Module {
  id: string;
  name: string;
  external_id: string;
  order_index?: number;
  is_free?: boolean;
  price_cents?: number;
  external_price_id?: string;
  subjects: Subject[];
}

export interface Year {
  id: string;
  name: string;
  external_id: string;
  modules: Module[];
}

// ── Flashcard model ────────────────────────────────────────────────────────

export interface Flashcard {
  id: string;
  lecture_id: string;
  front: string;
  back: string;
  image_url?: string | null;
  hint?: string | null;
  tags?: string[];
  card_order: number;
}

export interface UserCard {
  id: string;
  user_id: string;
  card_id: string;
  interval: number;
  repetition: number;
  ease_factor: number;
  next_review: string;
  created_at: string;
  updated_at: string;
}

// ── Session model ──────────────────────────────────────────────────────────

export type CardRating = "again" | "hard" | "good";

export interface RatedCard {
  card: Flashcard;
  rating: CardRating;
}

export interface CardSession {
  id?: string;
  user_id: string;
  lecture_id: string;
  lecture_name?: string;
  total_cards: number;
  again_count: number;
  hard_count: number;
  good_count: number;
  mastery_rate: number; // good_count / total_cards * 100
  created_at: string;
}

// ── User stats ─────────────────────────────────────────────────────────────

export interface SubjectMastery {
  subject: string;
  mastery: number;
}

export interface WeeklyDay {
  day: string;
  count: number;
  isToday: boolean;
}

export interface UserStats {
  total_sessions: number;
  total_cards: number;
  average_mastery: number;
  best_mastery: number;
  streak: number;
  weekly_activity: WeeklyDay[];
  subject_mastery: SubjectMastery[];
  recent_results: CardSession[];
}
