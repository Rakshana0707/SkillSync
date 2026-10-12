-- Fix broken state where an invite is ACCEPTED but the member was not properly added due to previous UI bugs
-- 1. Insert missing members
INSERT INTO public.hackathon_members (hackathon_id, user_id, email, name, test_completed, invite_accepted)
SELECT
  hi.hackathon_id,
  -- The candidate is whoever is NOT the owner of the hackathon
  CASE WHEN hi.inviter_id = h.user_id THEN hi.invitee_id ELSE hi.inviter_id END AS candidate_id,
  -- email fallback
  hi.invitee_email,
  -- name fallback
  NULL,
  TRUE,
  TRUE
FROM public.hackathon_invites hi
JOIN public.hackathons h ON h.id = hi.hackathon_id
WHERE hi.status = 'accepted'
ON CONFLICT (hackathon_id, email) DO UPDATE
SET invite_accepted = TRUE;

-- 2. Add the missing UPDATE policy so future accepts work correctly for invited candidates
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'hackathon_members' 
      AND policyname = 'hackathon_members: self update'
  ) THEN
    CREATE POLICY "hackathon_members: self update" ON public.hackathon_members
      FOR UPDATE USING (auth.uid() = user_id);
  END IF;
END $$;
