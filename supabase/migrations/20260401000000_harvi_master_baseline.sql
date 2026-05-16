-- 20260401000000_harvi_master_baseline.sql
-- Description: The Complete Harvi Schema Blueprint
-- Includes: Core Hierarchy, Student Data, Monetization Fields, Triggers, & Analytics.
-- Note: Security and RLS are managed in the Unified RLS Policies file.

BEGIN;

-- =============================================
-- 1. EXTENSIONS & SCHEMA SETUP
-- =============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_cron";

-- =============================================
-- 2. CORE ACADEMIC HIERARCHY
-- =============================================

-- Level 1: Years (Academic Programs)
CREATE TABLE IF NOT EXISTS public.years (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    external_id TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT unique_year_name UNIQUE (name)
);

-- Level 2: Modules (e.g., Cardiovascular System)
CREATE TABLE IF NOT EXISTS public.modules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    year_id UUID NOT NULL REFERENCES public.years(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    external_id TEXT NOT NULL UNIQUE,
    order_index INTEGER DEFAULT 0,
    -- Unified Monetization Logic
    is_free BOOLEAN NOT NULL DEFAULT false,
    price_cents INTEGER NOT NULL DEFAULT 0,
    external_price_id TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT unique_module_per_year UNIQUE (name, year_id)
);

-- Level 3: Subjects (e.g., Anatomy, Physiology)
CREATE TABLE IF NOT EXISTS public.subjects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    module_id UUID NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    external_id TEXT NOT NULL UNIQUE,
    order_index INTEGER DEFAULT 0,
    -- Unified Monetization Logic
    is_free BOOLEAN NOT NULL DEFAULT false,
    price_cents INTEGER NOT NULL DEFAULT 0,
    external_price_id TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT unique_subject_per_module UNIQUE (name, module_id)
);

-- Level 4: Lectures (e.g., Anatomy of the Heart)
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

-- Level 5: Questions (The MCQs)
CREATE TABLE IF NOT EXISTS public.questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lecture_id UUID NOT NULL REFERENCES public.lectures(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    image_url TEXT,
    options JSONB NOT NULL, -- Format: ["Opt A", "Opt B", "Opt C", "Opt D"]
    correct_answer_index INTEGER NOT NULL,
    explanation TEXT,
    question_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- 3. STUDENT DATA & ANALYTICS
-- =============================================

-- Profiles (Synced with Auth)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    full_name TEXT,
    avatar_url TEXT,
    bio TEXT,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Quiz Results
CREATE TABLE IF NOT EXISTS public.quiz_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    lecture_id UUID NOT NULL REFERENCES public.lectures(id) ON DELETE CASCADE,
    score INTEGER NOT NULL, -- Percentage (0-100)
    total_questions INTEGER NOT NULL,
    correct_answers INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Feedback
CREATE TABLE IF NOT EXISTS public.feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    content TEXT NOT NULL CHECK (char_length(content) > 0 AND char_length(content) < 10000),
    metadata JSONB DEFAULT '{}'::jsonb,
    status TEXT DEFAULT 'new' CHECK (status IN ('new', 'read', 'resolved', 'archived')),
    created_at TIMESTAMPTZ DEFAULT now()
);


-- Real-time Aggregate Statistics Table
CREATE TABLE IF NOT EXISTS public.lecture_statistics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lecture_id UUID NOT NULL REFERENCES public.lectures(id) ON DELETE CASCADE UNIQUE,
    unique_students INTEGER DEFAULT 0,
    total_attempts INTEGER DEFAULT 0,
    average_score NUMERIC(5,2) DEFAULT 0.00,
    last_updated TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- 4. MONETIZATION ENGINE
-- =============================================

CREATE TABLE IF NOT EXISTS public.purchases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    module_id UUID REFERENCES public.modules(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('pending', 'active', 'failed', 'refunded', 'disputed')),
    amount_cents INTEGER NOT NULL,
    currency TEXT NOT NULL DEFAULT 'usd',
    payment_id TEXT, -- provider-specific reference
    payment_session_id TEXT, -- checkout session reference
    provider TEXT NOT NULL DEFAULT 'manual',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- 5. CORE SECURITY & LOGIC FUNCTIONS
-- =============================================

-- Admin Role Detection

-- Analytics: Streak Calculation
-- NEW-CRIT-02 FIX: Enforces auth.uid() match — users can only query their own streak.
CREATE OR REPLACE FUNCTION get_user_streak(user_uuid UUID)
RETURNS INTEGER LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE streak INTEGER := 0; prev_date DATE := NULL; rec RECORD;
BEGIN
    -- Security: only allow querying own data (or admin)
    IF user_uuid != (SELECT auth.uid()) AND NOT public.is_admin() THEN
        RETURN 0;
    END IF;
    PERFORM 1 FROM public.quiz_results WHERE user_id = user_uuid AND DATE(created_at) >= CURRENT_DATE - INTERVAL '1 day' LIMIT 1;
    IF NOT FOUND THEN RETURN 0; END IF;
    FOR rec IN SELECT DISTINCT DATE(created_at) as quiz_date FROM public.quiz_results WHERE user_id = user_uuid ORDER BY quiz_date DESC LOOP
        IF prev_date IS NULL THEN streak := 1; prev_date := rec.quiz_date;
        ELSIF prev_date - rec.quiz_date = 1 THEN streak := streak + 1; prev_date := rec.quiz_date;
        ELSE EXIT; END IF;
    END LOOP;
    RETURN streak;
END;
$$;

-- Dashboard: Admin KPIs
-- NEW-CRIT-01 FIX: Admin guard added — was callable by any authenticated user.
CREATE OR REPLACE FUNCTION get_admin_dashboard_stats()
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE result JSONB;
BEGIN
    IF NOT public.is_admin() THEN RAISE EXCEPTION 'Unauthorized'; END IF;
    SELECT json_build_object(
        'totalStudents', (SELECT COUNT(*)::INTEGER FROM public.profiles),
        'totalQuestions', (SELECT COUNT(*)::INTEGER FROM public.questions),
        'totalQuizzes', (SELECT COUNT(*)::INTEGER FROM public.quiz_results),
        'activeToday', (SELECT COUNT(DISTINCT user_id)::INTEGER FROM public.quiz_results WHERE created_at >= CURRENT_DATE)
    ) INTO result;
    RETURN result;
END;
$$;

-- Advanced Slug Generator (Collision Proof)
CREATE OR REPLACE FUNCTION set_default_external_id() RETURNS TRIGGER AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  slug_exists BOOLEAN;
BEGIN
  IF NEW.external_id IS NULL OR trim(NEW.external_id) = '' THEN
    IF TG_TABLE_NAME = 'years' THEN
      base_slug := lower(regexp_replace(NEW.name, '[^a-zA-Z0-9]', '', 'g'));
    ELSE
      base_slug := trim(both '_' from lower(regexp_replace(trim(NEW.name), '[^a-zA-Z0-9]+', '_', 'g')));
    END IF;
    
    final_slug := base_slug;
    EXECUTE format('SELECT EXISTS(SELECT 1 FROM %I WHERE external_id = $1 AND id != $2)', TG_TABLE_NAME)
    INTO slug_exists USING final_slug, NEW.id;
    
    IF slug_exists THEN
       final_slug := base_slug || '_' || encode(gen_random_bytes(2), 'hex');
    END IF;
    NEW.external_id := final_slug;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. ANALYTICS & DASHBOARD FUNCTIONS
-- =============================================

-- KPI: Aggregate Stats
-- NEW-CRIT-02 FIX: Added auth.uid() guard — users can only query their own stats.
CREATE OR REPLACE FUNCTION get_user_aggregate_stats(user_uuid UUID)
RETURNS TABLE(total_quizzes BIGINT, total_questions BIGINT, total_correct BIGINT, best_score INTEGER) 
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT 
        COUNT(*)::BIGINT, 
        COALESCE(SUM(total_questions), 0)::BIGINT, 
        COALESCE(SUM(correct_answers), 0)::BIGINT, 
        COALESCE(MAX(score), 0)::INTEGER
    FROM public.quiz_results 
    WHERE user_id = user_uuid
      AND user_uuid = (SELECT auth.uid());
$$;

-- KPI: Active Users
-- NEW-CRIT-01 FIX: Admin guard added — was callable by any authenticated user.
CREATE OR REPLACE FUNCTION get_active_users_today()
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  RETURN (SELECT COUNT(DISTINCT user_id)::INTEGER FROM public.quiz_results WHERE created_at >= CURRENT_DATE);
END;
$$;

-- Analytics: Comprehensive Summary (for charts)
-- NEW-CRIT-01 FIX: Admin guard added — was callable by any authenticated user.
CREATE OR REPLACE FUNCTION get_analytics_summary(p_days INTEGER DEFAULT 30)
RETURNS JSON LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  result JSON;
  start_date TIMESTAMPTZ := NOW() - (p_days || ' days')::INTERVAL;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  WITH
    kpis AS (
      SELECT COUNT(*)::INTEGER AS total_quizzes_taken, COALESCE(ROUND(AVG(score))::INTEGER, 0) AS average_score,
        CASE WHEN COUNT(*) > 0 THEN ROUND(COUNT(*) FILTER (WHERE score >= 60) * 100.0 / COUNT(*))::INTEGER ELSE 0 END AS pass_rate,
        COUNT(DISTINCT user_id)::INTEGER AS active_students
      FROM quiz_results WHERE created_at >= start_date
    ),
    distribution AS (
      SELECT json_agg(json_build_object('range', range, 'count', cnt)) AS data
      FROM (
        SELECT CASE WHEN bucket = 0 THEN '0-20%' WHEN bucket = 1 THEN '20-40%' WHEN bucket = 2 THEN '40-60%' WHEN bucket = 3 THEN '60-80%' ELSE '80-100%' END AS range, COALESCE(cnt, 0)::INTEGER AS cnt
        FROM generate_series(0, 4) AS bucket
        LEFT JOIN (SELECT LEAST(FLOOR(score / 20.01)::INTEGER, 4) AS bucket, COUNT(*)::INTEGER AS cnt FROM quiz_results WHERE created_at >= start_date GROUP BY 1) counts USING (bucket) ORDER BY bucket
      ) sub
    ),
    activity AS (
      SELECT json_agg(json_build_object('date', d::DATE, 'quizzes', COALESCE(cnt, 0)) ORDER BY d) AS data
      FROM generate_series(start_date::DATE, CURRENT_DATE, '1 day'::INTERVAL) AS d
      LEFT JOIN (SELECT created_at::DATE AS day, COUNT(*)::INTEGER AS cnt FROM quiz_results WHERE created_at >= start_date GROUP BY 1) counts ON counts.day = d::DATE
    ),
    top_lectures AS (
      SELECT json_agg(json_build_object('name', COALESCE(l.name, 'Unknown'), 'attempts', ls.total_attempts) ORDER BY ls.total_attempts DESC) AS data
      FROM lecture_statistics ls LEFT JOIN lectures l ON l.id = ls.lecture_id ORDER BY ls.total_attempts DESC LIMIT 5
    )
  SELECT json_build_object('totalQuizzesTaken', k.total_quizzes_taken, 'averageScore', k.average_score, 'passRate', k.pass_rate, 'activeStudents', k.active_students, 'scoreDistribution', COALESCE(d.data, '[]'::JSON), 'quizActivity', COALESCE(a.data, '[]'::JSON), 'topLectures', COALESCE(tl.data, '[]'::JSON)) INTO result
  FROM kpis k, distribution d, activity a, top_lectures tl;
  RETURN result;
END;
$$;

-- Activity: Unified Feed
-- NEW-CRIT-01 FIX: Admin guard added — was callable by any authenticated user.
CREATE OR REPLACE FUNCTION get_recent_activity()
RETURNS JSON LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE result JSON;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  SELECT json_agg(row_data ORDER BY created_at DESC) INTO result FROM (
    (SELECT json_build_object('id', id, 'type', 'Year', 'entityName', name, 'createdAt', created_at, 'href', '/admin?tab=content&level=modules&yearId=' || id) AS row_data, created_at FROM years ORDER BY created_at DESC LIMIT 3) UNION ALL
    (SELECT json_build_object('id', id, 'type', 'Module', 'entityName', name, 'createdAt', created_at, 'href', '/admin?tab=content&level=subjects&moduleId=' || id), created_at FROM modules ORDER BY created_at DESC LIMIT 3) UNION ALL
    (SELECT json_build_object('id', id, 'type', 'Subject', 'entityName', name, 'createdAt', created_at, 'href', '/admin?tab=content&level=lectures&subjectId=' || id), created_at FROM subjects ORDER BY created_at DESC LIMIT 3) UNION ALL
    (SELECT json_build_object('id', id, 'type', 'Lecture', 'entityName', name, 'createdAt', created_at, 'href', '/admin?tab=questions&id=' || id || '&name=' || COALESCE(name, 'Lecture')), created_at FROM lectures ORDER BY created_at DESC LIMIT 3) UNION ALL
    (SELECT json_build_object('id', id, 'type', 'Question', 'entityName', CASE WHEN text IS NOT NULL AND text != '' THEN LEFT(text, 40) || '...' ELSE 'Unnamed Question' END, 'createdAt', created_at, 'href', '/admin?tab=questions&id=' || lecture_id || '&name=Lecture'), created_at FROM questions ORDER BY created_at DESC LIMIT 3)
  ) unified LIMIT 10;
  RETURN COALESCE(result, '[]'::JSON);
END;
$$;


-- =============================================
-- 7. TRIGGERS & AUTOMATION
-- =============================================

-- Profile Sync: Auth to Public
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

-- Real-time Stats Sync
CREATE OR REPLACE FUNCTION sync_lecture_stats() RETURNS TRIGGER AS $$
DECLARE is_new_student BOOLEAN;
BEGIN
    SELECT NOT EXISTS (SELECT 1 FROM quiz_results WHERE lecture_id = NEW.lecture_id AND user_id = NEW.user_id AND id != NEW.id) INTO is_new_student;
    INSERT INTO public.lecture_statistics (lecture_id, unique_students, total_attempts, average_score, last_updated)
    VALUES (NEW.lecture_id, CASE WHEN is_new_student THEN 1 ELSE 0 END, 1, NEW.score::NUMERIC, now())
    ON CONFLICT (lecture_id) DO UPDATE SET
        unique_students = lecture_statistics.unique_students + (CASE WHEN is_new_student THEN 1 ELSE 0 END),
        average_score = ROUND(((lecture_statistics.average_score * lecture_statistics.total_attempts) + NEW.score) / (lecture_statistics.total_attempts + 1), 2),
        total_attempts = lecture_statistics.total_attempts + 1, last_updated = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_sync_lecture_stats ON public.quiz_results;
CREATE TRIGGER tr_sync_lecture_stats AFTER INSERT ON public.quiz_results FOR EACH ROW EXECUTE FUNCTION sync_lecture_stats();

-- Trigger: Auto-Update Timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column() RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_update_years_updated_at ON years;
CREATE TRIGGER tr_update_years_updated_at BEFORE UPDATE ON years FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS tr_update_modules_updated_at ON modules;
CREATE TRIGGER tr_update_modules_updated_at BEFORE UPDATE ON modules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS tr_update_subjects_updated_at ON subjects;
CREATE TRIGGER tr_update_subjects_updated_at BEFORE UPDATE ON subjects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS tr_update_lectures_updated_at ON lectures;
CREATE TRIGGER tr_update_lectures_updated_at BEFORE UPDATE ON lectures FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS tr_update_questions_updated_at ON questions;
CREATE TRIGGER tr_update_questions_updated_at BEFORE UPDATE ON questions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS tr_update_profiles_updated_at ON profiles;
CREATE TRIGGER tr_update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- External ID Enforcement
DROP TRIGGER IF EXISTS ensure_external_id_years ON years;
CREATE TRIGGER ensure_external_id_years BEFORE INSERT OR UPDATE ON years FOR EACH ROW EXECUTE FUNCTION set_default_external_id();

DROP TRIGGER IF EXISTS ensure_external_id_modules ON modules;
CREATE TRIGGER ensure_external_id_modules BEFORE INSERT OR UPDATE ON modules FOR EACH ROW EXECUTE FUNCTION set_default_external_id();

DROP TRIGGER IF EXISTS ensure_external_id_subjects ON subjects;
CREATE TRIGGER ensure_external_id_subjects BEFORE INSERT OR UPDATE ON subjects FOR EACH ROW EXECUTE FUNCTION set_default_external_id();

DROP TRIGGER IF EXISTS ensure_external_id_lectures ON lectures;
CREATE TRIGGER ensure_external_id_lectures BEFORE INSERT OR UPDATE ON lectures FOR EACH ROW EXECUTE FUNCTION set_default_external_id();


-- =============================================
-- 8. PERFORMANCE INDEXES
-- =============================================

CREATE INDEX IF NOT EXISTS idx_quiz_results_user_date ON public.quiz_results(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_questions_lecture_order ON public.questions(lecture_id, question_order);
CREATE INDEX IF NOT EXISTS idx_purchases_user_id ON public.purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_lecture_stats_lecture ON public.lecture_statistics(lecture_id);
CREATE INDEX IF NOT EXISTS idx_feedback_status ON public.feedback(status);
CREATE INDEX IF NOT EXISTS idx_feedback_user_id ON public.feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_results_user_lecture ON public.quiz_results(user_id, lecture_id);

-- NEW-HIGH-02 FIX: Subject-level purchase lookups had no supporting index.
-- check_content_access() does WHERE p.subject_id = s.id AND p.status = 'active'
CREATE INDEX IF NOT EXISTS idx_purchases_user_subject_status
    ON public.purchases(user_id, subject_id, status)
    WHERE status = 'active';

-- Partial index for module-level purchase lookups (matching the existing pattern)
CREATE INDEX IF NOT EXISTS idx_purchases_user_module_status
    ON public.purchases(user_id, module_id, status)
    WHERE status = 'active';

-- Hierarchy Performance Indexes
CREATE INDEX IF NOT EXISTS idx_modules_year_id ON public.modules(year_id);
CREATE INDEX IF NOT EXISTS idx_subjects_module_id ON public.subjects(module_id);
CREATE INDEX IF NOT EXISTS idx_lectures_subject_id ON public.lectures(subject_id);

-- =============================================
-- 9. MAINTENANCE: CRON JOBS
-- =============================================

SELECT cron.schedule('harvi-weekly-cleanup', '0 3 * * 0', $$
    BEGIN;
        DELETE FROM public.quiz_results WHERE created_at < NOW() - INTERVAL '1 year';
        DELETE FROM public.feedback WHERE created_at < NOW() - INTERVAL '1 year';
    COMMIT;
$$);

COMMIT;
