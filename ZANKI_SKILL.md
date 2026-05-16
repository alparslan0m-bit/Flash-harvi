# ZANKI Flashcard App — Transformation Skill for Claude Code

## MISSION

Transform the Harvi MCQ codebase into **Zanki** — a spaced-repetition flashcard app — while preserving every design decision, component, hook pattern, navigation hierarchy, monetization engine, and Supabase RLS architecture from the original. The only things that change are: the quiz mechanic (MCQ → flashcard flip), the data model (questions/options/answers → cards with front/back), and the branding.

---

## GROUND RULES

1. **Do not rewrite from scratch.** Rename, adapt, and extend existing files.
2. **Preserve the design system completely.** Colors, fonts (Nunito + Inter), card radius (26), gradients, animations — all identical.
3. **Preserve the component hierarchy.** Years → Modules → Subjects → Lectures → Cards (same navigation stack, same screen structure).
4. **Preserve the monetization engine.** `purchases` table, `create-checkout`, `verify-purchase`, `payment-webhook` Edge Functions — untouched except for `module_id` references which stay the same.
5. **Preserve all offline-first patterns.** `AsyncStorage` caching, `NetInfo` checks, `offlineQueue`, `SyncContext` — identical logic adapted for cards.
6. **New Supabase project.** Zanki gets its own Supabase project. The two apps share the same subscription business model but have completely separate databases.
7. **Shared subscription model note.** If the owner later wants cross-app entitlements, that is a separate task. For now, each app sells its own modules independently.

---

## BRANDING CHANGES

| Item | Harvi | Zanki |
|---|---|---|
| App name | Harvi | Zanki |
| Tagline | "Medical Education, Elevated." | "Learn smarter, not harder." |
| `app.json` slug | `mobile` | `zanki` |
| `app.json` scheme | `mobile` | `zanki` |
| Storage key prefix | `harvi:` | `zanki:` |
| `AsyncStorage` queue key | `harvi:quiz_queue` | `zanki:card_queue` |
| Primary color | `#0ea5e9` (sky blue) | Keep identical — same design system |

---

## CORE MECHANIC — FLASHCARD SESSION

Replace the MCQ quiz session with a **flip-card spaced repetition session**.

### Card States
A session card has three possible self-ratings the user taps after flipping:
- **Again** (red) — didn't know it, show again soon
- **Hard** (orange) — knew it but struggled
- **Good** (green) — knew it easily

### Session Flow
1. Show card front (question/term side) — full screen card with flip button
2. User taps card or "Show Answer" button → card flips (3D Y-axis rotation) to reveal back (answer/definition side)
3. Three rating buttons appear: Again / Hard / Good
4. Record result, advance to next card
5. After all cards: show results screen (same `ResultsView` structure adapted for cards)

### Session Results
Instead of a percentage score, show:
- Total cards reviewed
- Again count (red)
- Hard count (orange)  
- Good count (green)
- "Mastery rate" = Good / Total × 100

---

## FILE RENAMES

| Original | New Name | Notes |
|---|---|---|
| `useQuiz.ts` | `useCards.ts` | Fetches flashcards instead of MCQ questions |
| `useQuizQuestions` (export) | `useFlashcards` | |
| `fetchQuestions` (export) | `fetchCards` | |
| `questionCache.ts` | `cardCache.ts` | Same logic, new key prefix |
| `QuizLoadingScreen.tsx` | `CardLoadingScreen.tsx` | Change copy only |
| `QuizReviewScreen.tsx` | `CardReviewScreen.tsx` | Show front/back pairs |
| `QuizResultsView.tsx` | `CardResultsView.tsx` | Adapted metrics |
| `OptionButton.tsx` | `RatingButton.tsx` | Again / Hard / Good buttons |
| `quiz/[lectureId].tsx` | `session/[lectureId].tsx` | The active card session screen |
| `useQuizResultsAnimation.ts` | `useSessionAnimation.ts` | Same animation, different label |
| `offlineQueue.ts` | Keep name | Change `PendingQuizResult` → `PendingCardSession` |
| `useStats.ts` | Keep name | Adapt computations for card ratings |
| `useProgress.ts` | Keep name | Same logic — marks lecture as "reviewed" |

---

## DATABASE SCHEMA

### New Supabase Project

Create a fresh Supabase project for Zanki. Run the migration below.

```sql
-- zanki_master_baseline.sql

BEGIN;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- ACADEMIC HIERARCHY (identical to Harvi)
-- =============================================

CREATE TABLE IF NOT EXISTS public.years (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    external_id TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT unique_year_name UNIQUE (name)
);

CREATE TABLE IF NOT EXISTS public.modules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    year_id UUID NOT NULL REFERENCES public.years(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    external_id TEXT NOT NULL UNIQUE,
    order_index INTEGER DEFAULT 0,
    is_free BOOLEAN NOT NULL DEFAULT false,
    price_cents INTEGER NOT NULL DEFAULT 0,
    external_price_id TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT unique_module_per_year UNIQUE (name, year_id)
);

CREATE TABLE IF NOT EXISTS public.subjects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    module_id UUID NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    external_id TEXT NOT NULL UNIQUE,
    order_index INTEGER DEFAULT 0,
    is_free BOOLEAN NOT NULL DEFAULT false,
    price_cents INTEGER NOT NULL DEFAULT 0,
    external_price_id TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT unique_subject_per_module UNIQUE (name, module_id)
);

CREATE TABLE IF NOT EXISTS public.lectures (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    external_id TEXT NOT NULL UNIQUE,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT unique_lecture_per_subject UNIQUE (name, subject_id)
);

-- =============================================
-- FLASHCARDS (replaces questions table)
-- =============================================

CREATE TABLE IF NOT EXISTS public.flashcards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lecture_id UUID NOT NULL REFERENCES public.lectures(id) ON DELETE CASCADE,
    front TEXT NOT NULL,           -- The question / term / prompt
    back TEXT NOT NULL,            -- The answer / definition / explanation
    image_url TEXT,                -- Optional image on front side
    hint TEXT,                     -- Optional hint shown before flip
    tags TEXT[],                   -- e.g. {'anatomy', 'high-yield'}
    card_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- STUDENT DATA
-- =============================================

CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    full_name TEXT,
    avatar_url TEXT,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Card session results (replaces quiz_results)
CREATE TABLE IF NOT EXISTS public.card_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    lecture_id UUID NOT NULL REFERENCES public.lectures(id) ON DELETE CASCADE,
    total_cards INTEGER NOT NULL,
    again_count INTEGER NOT NULL DEFAULT 0,   -- Red: didn't know
    hard_count INTEGER NOT NULL DEFAULT 0,    -- Orange: struggled
    good_count INTEGER NOT NULL DEFAULT 0,    -- Green: knew it
    mastery_rate INTEGER NOT NULL,            -- good_count / total_cards * 100
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    content TEXT NOT NULL CHECK (char_length(content) > 0 AND char_length(content) < 10000),
    status TEXT DEFAULT 'new' CHECK (status IN ('new', 'read', 'resolved', 'archived')),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- MONETIZATION (identical to Harvi)
-- =============================================

CREATE TABLE IF NOT EXISTS public.purchases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    module_id UUID REFERENCES public.modules(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('pending', 'active', 'failed', 'refunded', 'disputed')),
    amount_cents INTEGER NOT NULL,
    currency TEXT NOT NULL DEFAULT 'usd',
    payment_id TEXT,
    payment_session_id TEXT,
    provider TEXT NOT NULL DEFAULT 'manual',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- LECTURE STATISTICS (adapted for cards)
-- =============================================

CREATE TABLE IF NOT EXISTS public.lecture_statistics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lecture_id UUID NOT NULL REFERENCES public.lectures(id) ON DELETE CASCADE UNIQUE,
    unique_students INTEGER DEFAULT 0,
    total_sessions INTEGER DEFAULT 0,
    average_mastery NUMERIC(5,2) DEFAULT 0.00,
    last_updated TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- SECURITY FUNCTIONS
-- =============================================

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(
    (SELECT (raw_app_meta_data ->> 'role') = 'admin'
     FROM auth.users WHERE id = (SELECT auth.uid())),
    false
  );
$$;

CREATE OR REPLACE FUNCTION public.check_content_access(p_lecture_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT
        is_admin() OR
        EXISTS (
            SELECT 1
            FROM public.lectures l
            JOIN public.subjects s ON s.id = l.subject_id
            JOIN public.modules m ON m.id = s.module_id
            WHERE l.id = p_lecture_id AND (
                s.is_free = true OR
                m.is_free = true OR
                EXISTS (SELECT 1 FROM public.purchases p WHERE p.user_id = (SELECT auth.uid()) AND p.subject_id = s.id AND p.status = 'active') OR
                EXISTS (SELECT 1 FROM public.purchases p WHERE p.user_id = (SELECT auth.uid()) AND p.module_id = m.id AND p.status = 'active')
            )
        );
$$;

CREATE OR REPLACE FUNCTION public.get_content_access_map()
RETURNS TABLE (item_id UUID, item_type TEXT, has_access BOOLEAN, is_free BOOLEAN, price_cents INTEGER)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT id, 'module', true, is_free, price_cents FROM public.modules WHERE is_admin()
    UNION ALL
    SELECT m.id, 'module', (m.is_free OR EXISTS (SELECT 1 FROM public.purchases p WHERE p.user_id = (SELECT auth.uid()) AND p.module_id = m.id AND p.status = 'active')), m.is_free, m.price_cents FROM public.modules m WHERE NOT is_admin()
    UNION ALL
    SELECT s.id, 'subject', (s.is_free OR EXISTS (SELECT 1 FROM public.purchases p WHERE p.user_id = (SELECT auth.uid()) AND p.module_id = s.module_id AND p.status = 'active') OR EXISTS (SELECT 1 FROM public.purchases p WHERE p.user_id = (SELECT auth.uid()) AND p.subject_id = s.id AND p.status = 'active')), s.is_free, s.price_cents FROM public.subjects s WHERE NOT is_admin();
$$;

-- =============================================
-- TRIGGERS
-- =============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION sync_lecture_stats() RETURNS TRIGGER AS $$
DECLARE is_new_student BOOLEAN;
BEGIN
    SELECT NOT EXISTS (SELECT 1 FROM card_sessions WHERE lecture_id = NEW.lecture_id AND user_id = NEW.user_id AND id != NEW.id) INTO is_new_student;
    INSERT INTO public.lecture_statistics (lecture_id, unique_students, total_sessions, average_mastery, last_updated)
    VALUES (NEW.lecture_id, CASE WHEN is_new_student THEN 1 ELSE 0 END, 1, NEW.mastery_rate::NUMERIC, now())
    ON CONFLICT (lecture_id) DO UPDATE SET
        unique_students = lecture_statistics.unique_students + (CASE WHEN is_new_student THEN 1 ELSE 0 END),
        average_mastery = ROUND(((lecture_statistics.average_mastery * lecture_statistics.total_sessions) + NEW.mastery_rate) / (lecture_statistics.total_sessions + 1), 2),
        total_sessions = lecture_statistics.total_sessions + 1,
        last_updated = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_sync_lecture_stats ON public.card_sessions;
CREATE TRIGGER tr_sync_lecture_stats
  AFTER INSERT ON public.card_sessions
  FOR EACH ROW EXECUTE FUNCTION sync_lecture_stats();

CREATE OR REPLACE FUNCTION update_updated_at_column() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_update_modules_updated_at ON modules;
CREATE TRIGGER tr_update_modules_updated_at BEFORE UPDATE ON modules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS tr_update_subjects_updated_at ON subjects;
CREATE TRIGGER tr_update_subjects_updated_at BEFORE UPDATE ON subjects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS tr_update_lectures_updated_at ON lectures;
CREATE TRIGGER tr_update_lectures_updated_at BEFORE UPDATE ON lectures FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS tr_update_flashcards_updated_at ON flashcards;
CREATE TRIGGER tr_update_flashcards_updated_at BEFORE UPDATE ON flashcards FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- RLS
-- =============================================

ALTER TABLE public.years ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lectures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flashcards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.card_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lecture_statistics ENABLE ROW LEVEL SECURITY;

-- Admin bypass
CREATE POLICY "admins_all" ON public.years FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "admins_all" ON public.modules FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "admins_all" ON public.subjects FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "admins_all" ON public.lectures FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "admins_all" ON public.flashcards FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "admins_all" ON public.profiles FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "admins_all" ON public.card_sessions FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "admins_all" ON public.feedback FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "admins_all" ON public.purchases FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "admins_all" ON public.lecture_statistics FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- Public reads
CREATE POLICY "public_read" ON public.years FOR SELECT USING (true);
CREATE POLICY "public_read" ON public.modules FOR SELECT USING (true);
CREATE POLICY "public_read" ON public.subjects FOR SELECT USING (true);
CREATE POLICY "public_read" ON public.lectures FOR SELECT USING (true);
CREATE POLICY "auth_read" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read" ON public.lecture_statistics FOR SELECT TO authenticated USING (true);

-- Gated content (flashcards)
CREATE POLICY "flashcards_gated" ON public.flashcards FOR SELECT TO authenticated USING (check_content_access(lecture_id));

-- User data
CREATE POLICY "self_manage" ON public.profiles FOR UPDATE TO authenticated USING ((SELECT auth.uid()) = id) WITH CHECK ((SELECT auth.uid()) = id);
CREATE POLICY "self_insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = id);
CREATE POLICY "self_read" ON public.card_sessions FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
CREATE POLICY "self_insert" ON public.card_sessions FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "self_read" ON public.purchases FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
CREATE POLICY "self_read" ON public.feedback FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
CREATE POLICY "self_insert" ON public.feedback FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);

-- =============================================
-- INDEXES
-- =============================================

CREATE INDEX IF NOT EXISTS idx_card_sessions_user_date ON public.card_sessions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_flashcards_lecture_order ON public.flashcards(lecture_id, card_order);
CREATE INDEX IF NOT EXISTS idx_purchases_user_id ON public.purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_purchases_user_module_status ON public.purchases(user_id, module_id, status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_purchases_user_subject_status ON public.purchases(user_id, subject_id, status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_modules_year_id ON public.modules(year_id);
CREATE INDEX IF NOT EXISTS idx_subjects_module_id ON public.subjects(module_id);
CREATE INDEX IF NOT EXISTS idx_lectures_subject_id ON public.lectures(subject_id);

COMMIT;
```

---

## TYPE CHANGES (`types/index.ts`)

Replace the `Question`, `QuizResult`, `AnsweredState`, `HistoryItem` types:

```typescript
export interface Flashcard {
  id: string;
  lecture_id: string;
  front: string;           // Question / term side
  back: string;            // Answer / definition side
  image_url?: string;      // Optional image shown on front
  hint?: string;           // Optional hint before reveal
  tags?: string[];
}

// Per-card rating within a session
export type CardRating = 'again' | 'hard' | 'good';

export interface RatedCard {
  card: Flashcard;
  rating: CardRating;
}

export interface CardSession {
  id: string;
  user_id: string;
  lecture_id: string;
  lecture_name: string;
  total_cards: number;
  again_count: number;
  hard_count: number;
  good_count: number;
  mastery_rate: number;
  created_at: string;
}

export interface UserStats {
  total_sessions: number;
  total_cards: number;
  average_mastery: number;
  best_mastery: number;
  streak: number;
  weekly_activity: { day: string; count: number; isToday?: boolean }[];
  subject_mastery: { subject: string; mastery: number }[];
  recent_results: CardSession[];
}
```

Keep `Year`, `Module`, `Subject`, `Lecture` types identical. Update `Lecture` to have `card_count` instead of `question_count`.

---

## CARD CACHE (`lib/cardCache.ts`)

Identical to `questionCache.ts` with these substitutions:
- `harvi:qcache:` → `zanki:qcache:`
- `CachedLecture.questions: Question[]` → `CachedLecture.cards: Flashcard[]`
- `questionCount` → `cardCount`

---

## OFFLINE QUEUE (`lib/offlineQueue.ts`)

Identical logic. Rename:
- `harvi:quiz_queue` → `zanki:card_queue`
- `PendingQuizResult` → `PendingCardSession`
- Fields: `score`, `totalQuestions`, `correctAnswers` → `totalCards`, `againCount`, `hardCount`, `goodCount`, `masteryRate`

---

## `useCards.ts` (replaces `useQuiz.ts`)

```typescript
// Fetch flashcards for a lecture — exact same offline-first pattern as useQuiz.ts
// FK candidates: same list as LECTURE_FK_CANDIDATES in useQuiz.ts
// Column candidates for front: ['front', 'question', 'term', 'text', 'prompt', 'word']
// Column candidates for back: ['back', 'answer', 'definition', 'explanation', 'description']
// Column candidates for image: same IMAGE_URL_CANDIDATES
// Column candidates for hint: ['hint', 'tip', 'clue', 'note']

// fetchCards(lectureId): Promise<Flashcard[]>
//   1. Try FK columns in order until data.length > 0
//   2. Map each row to Flashcard using column candidates
//   3. Shuffle the deck before returning
//   4. Save to cardCache on success

// useFlashcards(lectureId, initialData?)
//   Same useQuery pattern as useQuizQuestions
//   queryKey: ['cards', lectureId, CARD_CACHE_VERSION]
```

---

## SESSION SCREEN (`app/session/[lectureId].tsx`)

Replaces `app/quiz/[lectureId].tsx`. Same structural skeleton, different inner content.

### State
```typescript
const [cards, setCards] = useState<Flashcard[] | null>(null);
const [currentIndex, setCurrentIndex] = useState(0);
const [isFlipped, setIsFlipped] = useState(false);
const [ratings, setRatings] = useState<CardRating[]>([]);
const [finished, setFinished] = useState(false);
const [reviewing, setReviewing] = useState(false);
```

### Card Flip Animation
```typescript
// Use react-native-reanimated interpolation on a shared value 0→1
// Front: rotateY 0° → 90° (opacity 1→0 at 90°)
// Back: rotateY -90° → 0° (opacity 0→1 from 90°)
// Duration: 300ms, easing: Easing.out(Easing.cubic)
const flipAnim = useSharedValue(0);
const flipCard = () => {
  flipAnim.value = withTiming(isFlipped ? 0 : 1, { duration: 300 });
  setIsFlipped(v => !v);
};
```

### Layout (Active Session)
```
[Header: X button | lecture name | "3/20" counter]
[Progress bar]
[Scroll content:]
  [CARD chip: "CARD 3"]
  [Card container — tap to flip]
    [Front face: card.front + optional image]
    [Back face: card.back (revealed after flip)]
  [Hint row: "Tap card to reveal answer" / shown before flip]
  [Rating buttons (shown only after flip):]
    [Again (red)] [Hard (orange)] [Good (green)]
```

### Rating Button Component (`RatingButton.tsx`)
Replaces `OptionButton.tsx`. Three variants:
- `again`: `colors.destructive` background, label "Again", Feather icon `x`
- `hard`: `colors.warning` background, label "Hard", Feather icon `minus`
- `good`: `colors.success` background, label "Good", Feather icon `check`

Each button does a scale spring animation on press. No shake/bounce since there is no wrong answer.

### handleRate(rating: CardRating)
```typescript
const handleRate = (rating: CardRating) => {
  setRatings(r => [...r, rating]);
  // Haptics: success for good, warning for hard, error for again
  if (currentIndex === cards.length - 1) {
    finishSession(rating);
  } else {
    setCurrentIndex(i => i + 1);
    setIsFlipped(false);
    flipAnim.value = 0; // Reset flip for next card
  }
};
```

### finishSession
Same pattern as `handleNext` in the quiz screen. Computes counts, inserts into `card_sessions`, enqueues offline if needed, invalidates queries.

---

## RESULTS SCREEN (`CardResultsView.tsx`)

Same structure as `QuizResultsView`. Replace `ScoreRing` (percentage) with a **Mastery Ring** showing `masteryRate%`. Replace `StatPill` trio with Again / Hard / Good counts.

```
[Mastery Ring: masteryRate% + grade label]
[Title: e.g. "Great session!" + icon]
[3 StatPills: Again (red) | Hard (orange) | Good (green)]
[Buttons: Study Again | Review Cards | Go Home]
```

---

## REVIEW SCREEN (`CardReviewScreen.tsx`)

Same structure as `QuizReviewScreen`. Each card shows:
- Front text
- Back text (always visible in review)
- Optional front image
- Rating badge (Again / Hard / Good) from the session

---

## `useStats.ts` — Adapted

Change `quiz_results` table reference → `card_sessions`. Change column references:
- `score` → `mastery_rate`
- `total_questions` → `total_cards`
- `correct_answers` → `good_count`

Stats output:
- `total_quizzes` → `total_sessions`
- `total_questions` → `total_cards`
- `average_score` → `average_mastery`
- `best_score` → `best_mastery`
- Streak logic: identical (one session per day = streak)
- Weekly activity: identical (count sessions per day)
- Subject mastery: average `mastery_rate` per lecture

---

## `useProgress.ts` — Adapted

Change table from `quiz_results` to `card_sessions`. Change FK column detection to look for `lecture_id` (same candidates). Logic otherwise identical — a lecture is "completed" if the user has at least one session for it.

---

## STATS SCREEN CHANGES

- Title: "Performance" → "Performance" (keep)
- Subtitle: "Your medical learning journey" → "Your learning journey"
- `StatsMetricsGrid`: labels change — "Quizzes" → "Sessions", "Questions" → "Cards", "Avg Score" → "Avg Mastery", "Best Score" → "Best Mastery"
- `StreakCard`: identical
- `WeeklyChart`: identical
- `MasterySection`: identical
- `RecentResultCard`: show `mastery_rate%` instead of `score%`

---

## LECTURE CARD (`LectureCard.tsx`)

Only copy change: `lecture.question_count` → `lecture.card_count`. Label: "X questions" → "X cards".

---

## HIERARCHY HOOK (`useHierarchy.ts`)

One change: in `buildHierarchyFromRemote`, when mapping lectures, read `card_count` instead of `question_count`:
```typescript
card_count: num(r.card_count ?? r.question_count),  // fallback for migration
```

---

## DOWNLOAD / CACHE (`useSubjectCache.ts`)

Change:
- `getLectureCacheMeta` → from `cardCache.ts`
- `fetchQuestions` → `fetchCards` from `useCards.ts`
- `saveQuestionsToCache` → `saveCardsToCache` from `cardCache.ts`
- `questionCount` → `cardCount` everywhere
- Labels: "questions" → "cards" in UI strings

---

## LOADING SCREEN (`CardLoadingScreen.tsx`)

Copy of `QuizLoadingScreen.tsx`. Change:
- Tips array: replace MCQ-specific tips with spaced-repetition tips:
  - "Spaced repetition is 2–3x more efficient than re-reading"
  - "Rating cards honestly is the key to effective recall"
  - "Even 10 cards a day compounds into mastery over time"
  - "The 'Again' button is not failure — it is the learning signal"
  - "Active recall beats passive review every single time"
  - "Consistency beats intensity in spaced repetition"
- Title: "Warming Engines" → "Loading Cards"

---

## STORAGE KEYS (`constants/storage.ts`)

```typescript
export const STORAGE_KEYS = {
  AVATAR: "zanki:avatar",
  DISPLAY_NAME: "zanki:displayName",
  THEME: "zanki:theme",
  HIERARCHY: "zanki:hierarchy",
} as const;
```

---

## `app.json` CHANGES

```json
{
  "expo": {
    "name": "Zanki",
    "slug": "zanki",
    "scheme": "zanki",
    "version": "1.0.0"
  }
}
```

---

## EDGE FUNCTIONS

Copy `create-checkout`, `verify-purchase`, `payment-webhook` from Harvi into the new Supabase project verbatim. They work identically since the `purchases` table schema is the same.

---

## ENV VARIABLES

Create a new `.env` file:
```
EXPO_PUBLIC_SUPABASE_URL=<zanki-supabase-url>
EXPO_PUBLIC_SUPABASE_ANON_KEY=<zanki-anon-key>
```

---

## CHECKLIST FOR CLAUDE CODE

Work through these in order. Do not skip steps.

- [ ] Rename `artifacts/mobile` folder copy to `artifacts/zanki` (or whatever the owner names it)
- [ ] Update `app.json`: name, slug, scheme
- [ ] Update `constants/storage.ts`: all `harvi:` → `zanki:`
- [ ] Update `lib/supabase.ts`: point to new Supabase URL/key env vars
- [ ] Rename `lib/questionCache.ts` → `lib/cardCache.ts`, update internals
- [ ] Rename `lib/offlineQueue.ts` internals: `PendingQuizResult` → `PendingCardSession`, field names, storage key
- [ ] Update `types/index.ts`: add `Flashcard`, `CardRating`, `RatedCard`, `CardSession`; update `UserStats`; update `Lecture.card_count`
- [ ] Create `hooks/useCards.ts` (adapts `useQuiz.ts` logic for flashcards)
- [ ] Update `hooks/useSubjectCache.ts`: import from `cardCache`, use `fetchCards`, `cardCount`
- [ ] Update `hooks/useProgress.ts`: query `card_sessions` table
- [ ] Update `hooks/useStats.ts`: query `card_sessions`, adapt field names
- [ ] Update `hooks/useHierarchy.ts`: `card_count` field
- [ ] Create `components/RatingButton.tsx` (replaces `OptionButton.tsx`)
- [ ] Create `components/CardLoadingScreen.tsx` (copy + modify `QuizLoadingScreen.tsx`)
- [ ] Create `components/CardReviewScreen.tsx` (adapts `QuizReviewScreen.tsx`)
- [ ] Create `components/CardResultsView.tsx` (adapts `QuizResultsView.tsx`)
- [ ] Create `app/session/[lectureId].tsx` (adapts `app/quiz/[lectureId].tsx`)
- [ ] Update `app/(tabs)/stats.tsx`: label changes only
- [ ] Update `components/StatsMetricsGrid.tsx`: label changes
- [ ] Update `components/LectureCard.tsx`: `question_count` → `card_count`
- [ ] Update `components/RecentResultCard.tsx`: `score` → `mastery_rate`
- [ ] Update `context/SyncContext.tsx`: reference `card_sessions` and `PendingCardSession`
- [ ] Update `app/_layout.tsx`: register `session/[lectureId]` route instead of `quiz/[lectureId]`
- [ ] Update `LectureCard` `onPress` to push `/session/[lectureId]` route
- [ ] Run the SQL migration on the new Supabase project
- [ ] Update `app/(tabs)/(learn)/index.tsx` subtitle
- [ ] Update `app/auth.tsx` tagline
- [ ] Global search-replace any remaining "harvi:" strings in storage keys
- [ ] Global search-replace `quiz_results` → `card_sessions` in any remaining files
- [ ] Verify TypeScript types (`pnpm typecheck`)

---

## WHAT TO LEAVE COMPLETELY UNCHANGED

- All navigation structure and routing patterns
- All design tokens, colors, typography, spacing, border-radius
- All `YearCard`, `ModuleCard`, `SubjectCard`, `LectureCard` visual design
- All `ProfileHeroCard`, `FeedbackForm`, `AccountActions` components
- All `DoctorAvatars`, `AvatarPicker` components
- All `WeeklyChart`, `MasteryBar`, `StreakCard` components
- All `AuthContext`, `ThemeContext` providers
- All `useHierarchy`, `useModuleAccess`, `usePurchase`, `useMyPurchases` hooks
- All monetization screens (`purchase/[moduleId].tsx`)
- All profile screens (`profile/edit.tsx`)
- The `SubjectDownloadButton`, `OfflineBanner` components
- The tab layout, blur effects, liquid glass support
- The `ErrorBoundary`, `ErrorFallback` components
- The `metro.config.js`, `babel.config.js`, `eas.json` build configs
- The `pnpm-workspace.yaml` and workspace structure
