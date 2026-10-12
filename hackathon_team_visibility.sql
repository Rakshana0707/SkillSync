-- ============================================================
-- SkillSync: hackathon_team_dismissals table
-- Lets individual members "dismiss" a team from their My Hackathon
-- view without deleting it for everyone else.
-- Run this in your Supabase SQL editor.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.hackathon_team_dismissals (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hackathon_id  UUID NOT NULL REFERENCES public.hackathons(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  dismissed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(hackathon_id, user_id)
);

ALTER TABLE public.hackathon_team_dismissals DISABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_htd_user
  ON public.hackathon_team_dismissals(user_id);

CREATE INDEX IF NOT EXISTS idx_htd_hackathon
  ON public.hackathon_team_dismissals(hackathon_id);
