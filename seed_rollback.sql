-- ============================================================================
-- SkillSync — seed_rollback.sql
-- Removes ALL rows inserted by seed.sql — nothing else is touched.
-- Run this in your Supabase SQL Editor to undo the seed.
-- ============================================================================

DO $$
DECLARE
  uid_alice  UUID := 'a1a1a1a1-0000-0000-0000-000000000001';
  uid_bob    UUID := 'b2b2b2b2-0000-0000-0000-000000000002';
  uid_carol  UUID := 'c3c3c3c3-0000-0000-0000-000000000003';
  hack_id    UUID := 'f1f1f1f1-0000-0000-0000-000000000001';
BEGIN

  -- 1. Peer reviews (references hackathons + profiles)
  DELETE FROM public.hackathon_peer_reviews
  WHERE hackathon_id = hack_id;

  -- 2. Team dismissals (references hackathons + profiles)
  DELETE FROM public.hackathon_team_dismissals
  WHERE hackathon_id = hack_id;

  -- 3. Hackathon invites (references hackathons + profiles)
  DELETE FROM public.hackathon_invites
  WHERE hackathon_id = hack_id;

  -- 4. Hackathon members (references hackathons + profiles)
  DELETE FROM public.hackathon_members
  WHERE hackathon_id = hack_id;

  -- 5. Hackathon itself
  DELETE FROM public.hackathons
  WHERE id = hack_id;

  -- 6. Test sessions
  DELETE FROM public.test_sessions
  WHERE user_id IN (uid_alice, uid_bob, uid_carol);

  -- 7. Skill progress
  DELETE FROM public.skill_progress
  WHERE user_id IN (uid_alice, uid_bob, uid_carol);

  -- 8. User interests
  DELETE FROM public.user_interests
  WHERE user_id IN (uid_alice, uid_bob, uid_carol);

  -- 9. User skills
  DELETE FROM public.user_skills
  WHERE user_id IN (uid_alice, uid_bob, uid_carol);

  -- 10. Profiles (last — everything else references this)
  DELETE FROM public.profiles
  WHERE id IN (uid_alice, uid_bob, uid_carol);

  RAISE NOTICE 'Seed rollback complete — all demo rows removed.';
END $$;
