-- ============================================================
-- SkillSync Migration: add invite_accepted to hackathon_members
-- Run this in your Supabase SQL editor BEFORE deploying
-- the updated hackathon page.
-- ============================================================

-- 1. Add the column (existing rows default to false)
ALTER TABLE public.hackathon_members
  ADD COLUMN IF NOT EXISTS invite_accepted BOOLEAN NOT NULL DEFAULT false;

-- 2. The hackathon creator's row should always be accepted.
--    Mark existing creator rows as accepted:
--    (creator = the user whose id matches hackathons.user_id)
UPDATE public.hackathon_members hm
SET invite_accepted = true
FROM public.hackathons h
WHERE hm.hackathon_id = h.id
  AND hm.user_id = h.user_id;

-- 3. Any invite that was already accepted should also flip the flag:
UPDATE public.hackathon_members hm
SET invite_accepted = true
FROM public.hackathon_invites hi
WHERE hi.hackathon_id = hm.hackathon_id
  AND hi.invitee_id   = hm.user_id
  AND hi.status       = 'accepted';

-- 4. Index for the new filter used in loadHackathons
CREATE INDEX IF NOT EXISTS idx_hm_user_accepted
  ON public.hackathon_members(user_id, invite_accepted);

-- ============================================================
-- Also run this if you haven't already (from last session):
-- ============================================================
CREATE TABLE IF NOT EXISTS public.hackathon_team_dismissals (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hackathon_id  UUID NOT NULL REFERENCES public.hackathons(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  dismissed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(hackathon_id, user_id)
);
ALTER TABLE public.hackathon_team_dismissals DISABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_htd_user ON public.hackathon_team_dismissals(user_id);
