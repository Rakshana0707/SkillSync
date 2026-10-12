-- ============================================================================
-- SkillSync — sql1.sql
-- New-feature migration: run this ONCE in your existing Supabase project's
-- SQL Editor. It is additive/idempotent — it only adds new columns, tables,
-- functions and policies. It does NOT touch your existing data.
--
-- Adds support for:
--   1. Skill re-verification / decay (expiring badges)
--   2. Public leaderboard (per skill)
--   3. Public shareable profile / badge page
--   4. Hackathon peer review + collaboration score
--   5. AI "explain your answer" follow-up scoring on test_sessions
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 0. Schema-drift safety net.
--    Your app code (app/hackathon/page.tsx) already reads/writes these
--    columns/table, but they were missing from SUPABASE_SCHEMA.md — meaning
--    either they already exist in your live project (most likely) or your
--    hackathon analysis/dismiss features have been silently failing. These
--    statements are fully idempotent (IF NOT EXISTS), so they're safe to run
--    either way and won't touch existing data.
-- ----------------------------------------------------------------------------

-- Ensure is_active and password_hash exist on profiles (may be absent from older deployments).
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_active      BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS password_hash  TEXT;
-- Ensure the updated_at trigger function exists (may be absent from older deployments).
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

ALTER TABLE public.hackathons
  ADD COLUMN IF NOT EXISTS project_blueprint TEXT,
  ADD COLUMN IF NOT EXISTS team_complementarity JSONB;

ALTER TABLE public.hackathon_members
  ADD COLUMN IF NOT EXISTS invite_accepted BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS public.hackathon_team_dismissals (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hackathon_id  UUID NOT NULL REFERENCES public.hackathons(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (hackathon_id, user_id)
);
ALTER TABLE public.hackathon_team_dismissals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "dismissals: owner all" ON public.hackathon_team_dismissals;
CREATE POLICY "dismissals: owner all" ON public.hackathon_team_dismissals
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- 1. Skill decay / re-verification timestamps
-- ----------------------------------------------------------------------------
ALTER TABLE public.skill_progress
  ADD COLUMN IF NOT EXISTS easy_verified_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS medium_verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS hard_verified_at   TIMESTAMPTZ;

-- Backfill: treat any already-completed level as verified "now" so nobody's
-- existing badge suddenly shows as expired the moment you run this.
UPDATE public.skill_progress
SET easy_verified_at = COALESCE(easy_verified_at, updated_at)
WHERE easy_completed = TRUE AND easy_verified_at IS NULL;

UPDATE public.skill_progress
SET medium_verified_at = COALESCE(medium_verified_at, updated_at)
WHERE medium_completed = TRUE AND medium_verified_at IS NULL;

UPDATE public.skill_progress
SET hard_verified_at = COALESCE(hard_verified_at, updated_at)
WHERE hard_completed = TRUE AND hard_verified_at IS NULL;

-- ----------------------------------------------------------------------------
-- 2. AI "explain your answer" follow-up round on test_sessions
-- ----------------------------------------------------------------------------
ALTER TABLE public.test_sessions
  ADD COLUMN IF NOT EXISTS followup_question  TEXT,
  ADD COLUMN IF NOT EXISTS followup_answer    TEXT,
  ADD COLUMN IF NOT EXISTS followup_score     NUMERIC(5,4),
  ADD COLUMN IF NOT EXISTS followup_feedback  TEXT;

-- ----------------------------------------------------------------------------
-- 3. Public leaderboard — SECURITY DEFINER function.
--    Exposes ONLY non-sensitive columns (no email/phone), regardless of the
--    caller's row-level permissions, so anyone can see the leaderboard.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_leaderboard(p_skill TEXT DEFAULT NULL, p_limit INT DEFAULT 50)
RETURNS TABLE (
  username         TEXT,
  full_name        TEXT,
  avatar_url       TEXT,
  skill_name       TEXT,
  best_level       TEXT,
  best_score       NUMERIC,
  tests_attempted  INT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.username,
    p.full_name,
    p.avatar_url,
    sp.skill_name,
    CASE
      WHEN sp.hard_completed THEN 'hard'
      WHEN sp.medium_completed THEN 'medium'
      WHEN sp.easy_completed THEN 'easy'
      ELSE 'none'
    END AS best_level,
    GREATEST(COALESCE(sp.hard_score, 0), COALESCE(sp.medium_score, 0), COALESCE(sp.easy_score, 0)) AS best_score,
    sp.tests_attempted
  FROM public.skill_progress sp
  JOIN public.profiles p ON p.id = sp.user_id
  WHERE (p_skill IS NULL OR sp.skill_name = p_skill)
    AND p.is_active = TRUE
  ORDER BY best_score DESC NULLS LAST, sp.tests_attempted ASC
  LIMIT p_limit;
$$;

GRANT EXECUTE ON FUNCTION public.get_leaderboard(TEXT, INT) TO authenticated, anon;

-- ----------------------------------------------------------------------------
-- 4. Public profile / shareable badge — SECURITY DEFINER function.
--    Powers /badge/[username]. Deliberately excludes email, phone, and any
--    auth-related fields.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_public_profile(p_username TEXT)
RETURNS TABLE (
  full_name           TEXT,
  username            TEXT,
  avatar_url          TEXT,
  bio                 TEXT,
  role                TEXT,
  skill_name          TEXT,
  easy_completed      BOOLEAN,
  medium_completed    BOOLEAN,
  hard_completed      BOOLEAN,
  easy_score          NUMERIC,
  medium_score        NUMERIC,
  hard_score          NUMERIC,
  easy_verified_at    TIMESTAMPTZ,
  medium_verified_at  TIMESTAMPTZ,
  hard_verified_at    TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.full_name, p.username, p.avatar_url, p.bio, p.role,
    sp.skill_name, sp.easy_completed, sp.medium_completed, sp.hard_completed,
    sp.easy_score, sp.medium_score, sp.hard_score,
    sp.easy_verified_at, sp.medium_verified_at, sp.hard_verified_at
  FROM public.profiles p
  JOIN public.skill_progress sp ON sp.user_id = p.id
  WHERE p.username = p_username AND p.is_active = TRUE
  ORDER BY COALESCE(sp.hard_score, sp.medium_score, sp.easy_score, 0) DESC NULLS LAST;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_profile(TEXT) TO authenticated, anon;

-- ----------------------------------------------------------------------------
-- 5. Hackathon peer review + collaboration score
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.hackathon_peer_reviews (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hackathon_id          UUID NOT NULL REFERENCES public.hackathons(id) ON DELETE CASCADE,
  reviewer_id           UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reviewee_id           UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  contribution_rating   SMALLINT NOT NULL CHECK (contribution_rating BETWEEN 1 AND 5),
  communication_rating  SMALLINT NOT NULL CHECK (communication_rating BETWEEN 1 AND 5),
  technical_rating      SMALLINT NOT NULL CHECK (technical_rating BETWEEN 1 AND 5),
  comment               TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (hackathon_id, reviewer_id, reviewee_id),
  CHECK (reviewer_id <> reviewee_id)
);

DROP TRIGGER IF EXISTS trg_peer_reviews_updated_at ON public.hackathon_peer_reviews;
CREATE TRIGGER trg_peer_reviews_updated_at BEFORE UPDATE ON public.hackathon_peer_reviews
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

ALTER TABLE public.hackathon_peer_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "peer_reviews: select involved or owner" ON public.hackathon_peer_reviews;
CREATE POLICY "peer_reviews: select involved or owner" ON public.hackathon_peer_reviews
  FOR SELECT USING (
    auth.uid() = reviewer_id
    OR auth.uid() = reviewee_id
    OR EXISTS (SELECT 1 FROM public.hackathons h WHERE h.id = hackathon_id AND h.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "peer_reviews: insert by team member" ON public.hackathon_peer_reviews;
CREATE POLICY "peer_reviews: insert by team member" ON public.hackathon_peer_reviews
  FOR INSERT WITH CHECK (
    auth.uid() = reviewer_id
    AND EXISTS (
      SELECT 1 FROM public.hackathon_members hm
      WHERE hm.hackathon_id = hackathon_peer_reviews.hackathon_id AND hm.user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM public.hackathon_members hm
      WHERE hm.hackathon_id = hackathon_peer_reviews.hackathon_id AND hm.user_id = reviewee_id
    )
  );

DROP POLICY IF EXISTS "peer_reviews: update own" ON public.hackathon_peer_reviews;
CREATE POLICY "peer_reviews: update own" ON public.hackathon_peer_reviews
  FOR UPDATE USING (auth.uid() = reviewer_id);

DROP POLICY IF EXISTS "peer_reviews: delete own" ON public.hackathon_peer_reviews;
CREATE POLICY "peer_reviews: delete own" ON public.hackathon_peer_reviews
  FOR DELETE USING (auth.uid() = reviewer_id);

-- Aggregate collaboration score per member of a hackathon (SECURITY DEFINER so
-- teammates can see each other's averaged score without being able to see who
-- gave which individual rating unless they're the hackathon owner or the
-- reviewee reading their own detailed rows via the table policies above).
CREATE OR REPLACE FUNCTION public.get_hackathon_collaboration_scores(p_hackathon_id UUID)
RETURNS TABLE (
  reviewee_id           UUID,
  full_name             TEXT,
  avg_contribution      NUMERIC,
  avg_communication     NUMERIC,
  avg_technical         NUMERIC,
  overall_score         NUMERIC,
  review_count          INT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    r.reviewee_id,
    p.full_name,
    ROUND(AVG(r.contribution_rating)::numeric, 2)  AS avg_contribution,
    ROUND(AVG(r.communication_rating)::numeric, 2) AS avg_communication,
    ROUND(AVG(r.technical_rating)::numeric, 2)     AS avg_technical,
    ROUND(AVG((r.contribution_rating + r.communication_rating + r.technical_rating) / 3.0)::numeric, 2) AS overall_score,
    COUNT(*)::int AS review_count
  FROM public.hackathon_peer_reviews r
  JOIN public.profiles p ON p.id = r.reviewee_id
  WHERE r.hackathon_id = p_hackathon_id
    AND EXISTS (
      -- caller must be a member (or owner) of this hackathon to call this
      SELECT 1 FROM public.hackathon_members hm WHERE hm.hackathon_id = p_hackathon_id AND hm.user_id = auth.uid()
      UNION
      SELECT 1 FROM public.hackathons h WHERE h.id = p_hackathon_id AND h.user_id = auth.uid()
    )
  GROUP BY r.reviewee_id, p.full_name;
$$;

GRANT EXECUTE ON FUNCTION public.get_hackathon_collaboration_scores(UUID) TO authenticated;

-- ============================================================================
-- Done. Nothing above drops or rewrites existing tables/policies.
-- ============================================================================
