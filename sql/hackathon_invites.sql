-- ============================================================
-- SkillSync: hackathon_invites table
-- Run this in your Supabase SQL editor
-- ============================================================

CREATE TABLE IF NOT EXISTS public.hackathon_invites (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hackathon_id    UUID NOT NULL REFERENCES public.hackathons(id) ON DELETE CASCADE,
  inviter_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  invitee_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  invitee_email   TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  responded_at    TIMESTAMPTZ,
  UNIQUE(hackathon_id, invitee_id)
);

-- Disable RLS to match rest of the project's approach
ALTER TABLE public.hackathon_invites DISABLE ROW LEVEL SECURITY;

-- Index for fast lookup by invitee (used in "Requests" tab)
CREATE INDEX IF NOT EXISTS idx_hackathon_invites_invitee
  ON public.hackathon_invites(invitee_id, status);

-- Index for fast lookup by hackathon
CREATE INDEX IF NOT EXISTS idx_hackathon_invites_hackathon
  ON public.hackathon_invites(hackathon_id);
