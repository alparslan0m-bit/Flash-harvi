-- zanki_master_baseline.sql

BEGIN;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- ACADEMIC HIERARCHY
-- =============================================

CREATE TABLE IF NOT EXISTS public.years (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    external_id TEXT NOT NULL UNIQUE,
    order_index INTEGER DEFAULT 0,
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
    card_count INTEGER DEFAULT 0,
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
    lecture_name TEXT,
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
-- MONETIZATION
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
-- LECTURE STATISTICS
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_sync_lecture_stats ON public.card_sessions;
CREATE TRIGGER tr_sync_lecture_stats
  AFTER INSERT ON public.card_sessions
  FOR EACH ROW EXECUTE FUNCTION sync_lecture_stats();

CREATE OR REPLACE FUNCTION update_updated_at_column() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_update_years_updated_at ON years;
CREATE TRIGGER tr_update_years_updated_at BEFORE UPDATE ON years FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
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
