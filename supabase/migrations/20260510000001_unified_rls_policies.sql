-- 20260510000001_unified_rls_policies.sql
-- Description: The Ultimate Unified RLS Architecture for Harvi.
-- This file centralizes all security functions, RLS enabling, and access policies.
-- Design Principle: Scalable, Admin-aware, and Performance-Hardened.
--
-- SECURITY AUDIT HARDENING (2026-05-11):
--   CRIT-01: is_admin() now reads raw_app_meta_data only (no JWT claim spoofing)
--   HIGH-02: Replaced DROP-ALL loop with explicit per-policy DROP/CREATE
--   LOW-01: Feedback restricted to authenticated only
--   NEW-MEDIUM-01: Profiles self-insert policy added

BEGIN;

-- =============================================
-- 1. SECURITY FUNCTIONS (The Logic Layer)
-- =============================================

-- 1.1 Admin Role Detection
-- HARDENED: Only reads raw_app_meta_data which is writable exclusively by service_role.
-- A client JWT cannot forge this value. Language changed to sql for immutable inlining.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT (raw_app_meta_data ->> 'role') = 'admin'
     FROM auth.users
     WHERE id = (SELECT auth.uid())),
    false
  );
$$;

-- 1.2 The Master Access Gatekeeper (Performance Optimized)
-- All auth.uid() calls wrapped in (SELECT ...) for O(1) evaluation.
CREATE OR REPLACE FUNCTION public.check_content_access(p_lecture_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
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

-- 1.3 UI Access Map (Idempotent UI Badge Logic)
-- Returns access status for every module and subject for the calling user.
CREATE OR REPLACE FUNCTION public.get_content_access_map()
RETURNS TABLE (item_id UUID, item_type TEXT, has_access BOOLEAN, is_free BOOLEAN, price_cents INTEGER)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    -- Admin: Full Access
    SELECT id, 'module', true, is_free, price_cents FROM public.modules WHERE is_admin()
    UNION ALL
    -- Non-Admin: Modules
    SELECT m.id, 'module', (m.is_free OR EXISTS (SELECT 1 FROM public.purchases p WHERE p.user_id = (SELECT auth.uid()) AND p.module_id = m.id AND p.status = 'active')), m.is_free, m.price_cents FROM public.modules m WHERE NOT is_admin()
    UNION ALL
    -- Non-Admin: Subjects
    SELECT s.id, 'subject', (s.is_free OR EXISTS (SELECT 1 FROM public.purchases p WHERE p.user_id = (SELECT auth.uid()) AND p.module_id = s.module_id AND p.status = 'active') OR EXISTS (SELECT 1 FROM public.purchases p WHERE p.user_id = (SELECT auth.uid()) AND p.subject_id = s.id AND p.status = 'active')), s.is_free, s.price_cents FROM public.subjects s WHERE NOT is_admin();
$$;

-- =============================================
-- 2. ADMIN HELPERS (Privileged Operations)
-- =============================================

CREATE OR REPLACE FUNCTION public.admin_grant_free_module(p_module_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    IF NOT is_admin() THEN RAISE EXCEPTION 'Unauthorized'; END IF;
    UPDATE public.modules SET is_free = true WHERE id = p_module_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_grant_free_subject(p_subject_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    IF NOT is_admin() THEN RAISE EXCEPTION 'Unauthorized'; END IF;
    UPDATE public.subjects SET is_free = true WHERE id = p_subject_id;
END;
$$;

-- =============================================
-- 3. ENABLE RLS (The Boundary Layer)
-- =============================================

ALTER TABLE public.years ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lectures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lecture_statistics ENABLE ROW LEVEL SECURITY;


-- =============================================
-- 4. CLEANUP (Explicit Per-Policy Drops)
-- =============================================
-- HIGH-02 FIX: Replaced the dangerous DO $$ DROP-ALL loop.
-- Each policy is now dropped individually by its exact name + table.
-- If this migration fails mid-run, only the already-dropped policies are missing,
-- not the entire schema. The BEGIN/COMMIT transaction protects atomicity.

-- Admin bypass policies
DROP POLICY IF EXISTS "admins_years_all" ON public.years;
DROP POLICY IF EXISTS "admins_modules_all" ON public.modules;
DROP POLICY IF EXISTS "admins_subjects_all" ON public.subjects;
DROP POLICY IF EXISTS "admins_lectures_all" ON public.lectures;
DROP POLICY IF EXISTS "admins_questions_all" ON public.questions;
DROP POLICY IF EXISTS "admins_profiles_all" ON public.profiles;
DROP POLICY IF EXISTS "admins_quiz_results_all" ON public.quiz_results;
DROP POLICY IF EXISTS "admins_feedback_all" ON public.feedback;
DROP POLICY IF EXISTS "admins_purchases_all" ON public.purchases;
DROP POLICY IF EXISTS "admins_lecture_statistics_all" ON public.lecture_statistics;


-- Public/structural read policies
DROP POLICY IF EXISTS "years_public_read" ON public.years;
DROP POLICY IF EXISTS "modules_public_read" ON public.modules;
DROP POLICY IF EXISTS "subjects_public_read" ON public.subjects;
DROP POLICY IF EXISTS "lectures_public_read" ON public.lectures;
DROP POLICY IF EXISTS "profiles_authenticated_read" ON public.profiles;
DROP POLICY IF EXISTS "lecture_statistics_authenticated_read" ON public.lecture_statistics;

-- Gated content
DROP POLICY IF EXISTS "questions_gated_access" ON public.questions;

-- Private user data
DROP POLICY IF EXISTS "profiles_self_manage" ON public.profiles;
DROP POLICY IF EXISTS "profiles_self_insert" ON public.profiles;
DROP POLICY IF EXISTS "quiz_results_self_read" ON public.quiz_results;
DROP POLICY IF EXISTS "quiz_results_self_insert" ON public.quiz_results;
DROP POLICY IF EXISTS "purchases_self_read" ON public.purchases;
DROP POLICY IF EXISTS "feedback_self_read" ON public.feedback;
DROP POLICY IF EXISTS "feedback_self_insert" ON public.feedback;


-- Also drop any legacy-named policies that may still exist from previous migrations
DROP POLICY IF EXISTS "Admins have full access" ON public.years;
DROP POLICY IF EXISTS "Admins have full access" ON public.modules;
DROP POLICY IF EXISTS "Admins have full access" ON public.subjects;
DROP POLICY IF EXISTS "Admins have full access" ON public.lectures;
DROP POLICY IF EXISTS "Admins have full access" ON public.questions;
DROP POLICY IF EXISTS "Admins have full access" ON public.profiles;
DROP POLICY IF EXISTS "Admins have full access" ON public.quiz_results;
DROP POLICY IF EXISTS "Admins have full access" ON public.feedback;
DROP POLICY IF EXISTS "Admins have full access" ON public.purchases;
DROP POLICY IF EXISTS "Admins have full access" ON public.lecture_statistics;
DROP POLICY IF EXISTS "Public Read" ON public.years;
DROP POLICY IF EXISTS "Public Read" ON public.modules;
DROP POLICY IF EXISTS "Public Read" ON public.subjects;
DROP POLICY IF EXISTS "Public Read" ON public.lectures;
DROP POLICY IF EXISTS "Authenticated Read" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated Read" ON public.lecture_statistics;
DROP POLICY IF EXISTS "Gated access to questions" ON public.questions;
DROP POLICY IF EXISTS "Self Manage" ON public.profiles;
DROP POLICY IF EXISTS "Self Read" ON public.quiz_results;
DROP POLICY IF EXISTS "Self Insert" ON public.quiz_results;
DROP POLICY IF EXISTS "Self Read" ON public.purchases;
DROP POLICY IF EXISTS "Self Read" ON public.feedback;
DROP POLICY IF EXISTS "Self Insert" ON public.feedback;


-- =============================================
-- 5. POLICIES: GLOBAL ADMIN BYPASS
-- =============================================
-- Naming convention: table_operation (unique, automation-friendly)

CREATE POLICY "admins_years_all" ON public.years FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "admins_modules_all" ON public.modules FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "admins_subjects_all" ON public.subjects FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "admins_lectures_all" ON public.lectures FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "admins_questions_all" ON public.questions FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "admins_profiles_all" ON public.profiles FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "admins_quiz_results_all" ON public.quiz_results FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "admins_feedback_all" ON public.feedback FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "admins_purchases_all" ON public.purchases FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "admins_lecture_statistics_all" ON public.lecture_statistics FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());


-- =============================================
-- 6. POLICIES: PUBLIC & STRUCTURAL
-- =============================================
-- Years, modules, subjects, lectures are publicly readable for navigation/UI.
-- Questions are gated (see section 7). Profiles are authenticated-only read.

CREATE POLICY "years_public_read" ON public.years FOR SELECT USING (true);
CREATE POLICY "modules_public_read" ON public.modules FOR SELECT USING (true);
CREATE POLICY "subjects_public_read" ON public.subjects FOR SELECT USING (true);
CREATE POLICY "lectures_public_read" ON public.lectures FOR SELECT USING (true);
CREATE POLICY "profiles_authenticated_read" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "lecture_statistics_authenticated_read" ON public.lecture_statistics FOR SELECT TO authenticated USING (true);

-- =============================================
-- 7. POLICIES: GATED CONTENT
-- =============================================
-- Questions are the only gated table. Access is determined by check_content_access().

CREATE POLICY "questions_gated_access" ON public.questions FOR SELECT TO authenticated USING (check_content_access(lecture_id));

-- =============================================
-- 8. POLICIES: PRIVATE USER DATA
-- =============================================

-- Profiles: Self-Update + Self-Insert (safety net if trigger fails)
CREATE POLICY "profiles_self_manage" ON public.profiles FOR UPDATE TO authenticated USING ((SELECT auth.uid()) = id) WITH CHECK ((SELECT auth.uid()) = id);
CREATE POLICY "profiles_self_insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = id);

-- Quiz Results: Self-Read + Self-Insert (immutable — no UPDATE policy by design)
CREATE POLICY "quiz_results_self_read" ON public.quiz_results FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
CREATE POLICY "quiz_results_self_insert" ON public.quiz_results FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);

-- Purchases: Self-Read ONLY (inserts/updates are service_role via Edge Functions)
CREATE POLICY "purchases_self_read" ON public.purchases FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);

-- Feedback: Self-Read + Self-Insert (authenticated only — LOW-01 fix: removed anon)
CREATE POLICY "feedback_self_read" ON public.feedback FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
CREATE POLICY "feedback_self_insert" ON public.feedback FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);



COMMIT;
