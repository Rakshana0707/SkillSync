-- ============================================================================
-- SkillSync — seed.sql
-- Demo seed data for ALL tables.
-- Run AFTER sql1.sql in your Supabase SQL Editor.
--
-- Creates:
--   • 3 demo users  (alice, bob, carol)
--   • skills + interests per user
--   • skill_progress with realistic scores + verified_at dates
--   • test_sessions (incl. followup AI columns)
--   • 1 hackathon with members, invites, dismissal, peer reviews
-- ============================================================================

-- ============================================================================
-- HELPER: password hash for "Password123!" pre-computed via SHA-256
-- Real value: sha256("Password123!") in hex
-- Use this to log in as any seed user: password = Password123!
-- ============================================================================

DO $$
DECLARE
  uid_alice  UUID := 'a1a1a1a1-0000-0000-0000-000000000001';
  uid_bob    UUID := 'b2b2b2b2-0000-0000-0000-000000000002';
  uid_carol  UUID := 'c3c3c3c3-0000-0000-0000-000000000003';
  hack_id    UUID := 'f1f1f1f1-0000-0000-0000-000000000001';

  -- SHA-256 of "Password123!" — used for all seed accounts
  pw_hash    TEXT := '6b86b273ff34fce19d6b804eff5a3f5747ada4eaa22f1d49c01e52ddb7875b4b';

BEGIN

-- ============================================================================
-- 1. PROFILES
-- ============================================================================
INSERT INTO public.profiles (id, full_name, username, email, phone, password_hash, bio, role, year_of_study, theme, is_active)
VALUES
  (uid_alice, 'Alice Sharma',   'alice_dev',   'alice@skillsync.demo',   '+919900000001', pw_hash,
   'Full-stack developer passionate about React and PostgreSQL.', 'student',      '3rd Year', 'dark',  TRUE),
  (uid_bob,   'Bob Krishnan',   'bob_builds',  'bob@skillsync.demo',     '+919900000002', pw_hash,
   'Backend engineer. Loves Go, Docker and clean APIs.',          'professional', NULL,       'dark',  TRUE),
  (uid_carol, 'Carol Mendes',   'carol_codes', 'carol@skillsync.demo',   '+919900000003', pw_hash,
   'ML enthusiast and Python wizard. Open-source contributor.',   'student',      '2nd Year', 'light', TRUE)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 2. USER SKILLS
-- ============================================================================
INSERT INTO public.user_skills (user_id, skill_name, category)
VALUES
  -- Alice
  (uid_alice, 'React.js',    'Frontend'),
  (uid_alice, 'PostgreSQL',  'Database'),
  (uid_alice, 'TypeScript',  'Language'),
  -- Bob
  (uid_bob,   'Go',          'Language'),
  (uid_bob,   'Docker',      'DevOps'),
  (uid_bob,   'Node.js',     'Backend'),
  -- Carol
  (uid_carol, 'Python',      'Language'),
  (uid_carol, 'MongoDB',     'Database'),
  (uid_carol, 'React.js',    'Frontend')
ON CONFLICT (user_id, skill_name) DO NOTHING;

-- ============================================================================
-- 3. USER INTERESTS
-- ============================================================================
INSERT INTO public.user_interests (user_id, interest_name)
VALUES
  (uid_alice, 'Web Development'),
  (uid_alice, 'UI/UX Design'),
  (uid_alice, 'Open Source'),
  (uid_bob,   'DevOps & Cloud'),
  (uid_bob,   'System Design'),
  (uid_bob,   'Competitive Programming'),
  (uid_carol, 'AI / Machine Learning'),
  (uid_carol, 'Data Science'),
  (uid_carol, 'Open Source')
ON CONFLICT (user_id, interest_name) DO NOTHING;

-- ============================================================================
-- 4. SKILL PROGRESS
--    Alice: React easy✓ medium✓, PostgreSQL easy✓
--    Bob:   Go easy✓ medium✓ hard✓, Docker easy✓
--    Carol: Python easy✓ medium✓, MongoDB easy✓
-- ============================================================================
INSERT INTO public.skill_progress (
  user_id, skill_name,
  easy_completed, medium_completed, hard_completed,
  easy_score, medium_score, hard_score,
  weak_concepts, tests_attempted,
  easy_verified_at, medium_verified_at, hard_verified_at,
  last_attempt
)
VALUES
  -- Alice / React.js
  (uid_alice, 'React.js',
   TRUE, TRUE, FALSE,
   0.8000, 0.7000, NULL,
   ARRAY['useEffect cleanup', 'React.memo'],  4,
   NOW() - INTERVAL '30 days', NOW() - INTERVAL '10 days', NULL,
   NOW() - INTERVAL '10 days'),

  -- Alice / PostgreSQL
  (uid_alice, 'PostgreSQL',
   TRUE, FALSE, FALSE,
   0.7500, NULL, NULL,
   ARRAY['Window functions', 'CTEs'],         2,
   NOW() - INTERVAL '20 days', NULL, NULL,
   NOW() - INTERVAL '20 days'),

  -- Alice / TypeScript
  (uid_alice, 'TypeScript',
   FALSE, FALSE, FALSE,
   NULL, NULL, NULL,
   ARRAY[]::TEXT[],                           0,
   NULL, NULL, NULL, NULL),

  -- Bob / Go
  (uid_bob, 'Go',
   TRUE, TRUE, TRUE,
   0.9500, 0.8800, 0.8000,
   ARRAY[]::TEXT[],                           7,
   NOW() - INTERVAL '60 days', NOW() - INTERVAL '45 days', NOW() - INTERVAL '15 days',
   NOW() - INTERVAL '15 days'),

  -- Bob / Docker
  (uid_bob, 'Docker',
   TRUE, FALSE, FALSE,
   0.8200, NULL, NULL,
   ARRAY['Multi-stage builds'],               3,
   NOW() - INTERVAL '40 days', NULL, NULL,
   NOW() - INTERVAL '40 days'),

  -- Bob / Node.js
  (uid_bob, 'Node.js',
   TRUE, TRUE, FALSE,
   0.7800, 0.6500, NULL,
   ARRAY['Event loop', 'Streams'],            5,
   NOW() - INTERVAL '50 days', NOW() - INTERVAL '25 days', NULL,
   NOW() - INTERVAL '25 days'),

  -- Carol / Python
  (uid_carol, 'Python',
   TRUE, TRUE, FALSE,
   0.9200, 0.8500, NULL,
   ARRAY['Decorators', 'Async/await'],        5,
   NOW() - INTERVAL '35 days', NOW() - INTERVAL '12 days', NULL,
   NOW() - INTERVAL '12 days'),

  -- Carol / MongoDB
  (uid_carol, 'MongoDB',
   TRUE, FALSE, FALSE,
   0.6800, NULL, NULL,
   ARRAY['Aggregation pipeline', 'Indexing'], 2,
   NOW() - INTERVAL '25 days', NULL, NULL,
   NOW() - INTERVAL '25 days'),

  -- Carol / React.js
  (uid_carol, 'React.js',
   FALSE, FALSE, FALSE,
   NULL, NULL, NULL,
   ARRAY[]::TEXT[],                           1,
   NULL, NULL, NULL,
   NOW() - INTERVAL '2 days')
ON CONFLICT (user_id, skill_name) DO NOTHING;

-- ============================================================================
-- 5. TEST SESSIONS
-- ============================================================================
INSERT INTO public.test_sessions (
  user_id, skill, level,
  score, total_questions, correct_answers, passed,
  auto_submitted, weak_concepts, time_taken_sec,
  followup_question, followup_answer, followup_score, followup_feedback
)
VALUES
  -- Alice React easy pass
  (uid_alice, 'React.js', 'easy',
   0.8000, 10, 8, TRUE,
   FALSE, ARRAY['useEffect cleanup'], 720,
   'Explain what happens when a useEffect cleanup runs.',
   'The cleanup function runs before the component unmounts or before the effect re-runs.',
   0.8500, 'Good explanation. Could mention dependency array specifics.'),

  -- Alice React medium pass
  (uid_alice, 'React.js', 'medium',
   0.7000, 10, 7, TRUE,
   FALSE, ARRAY['React.memo'], 1100,
   NULL, NULL, NULL, NULL),

  -- Alice PostgreSQL easy pass
  (uid_alice, 'PostgreSQL', 'easy',
   0.7500, 10, 7, TRUE,
   FALSE, ARRAY['Window functions', 'CTEs'], 900,
   'What is the difference between ROW_NUMBER() and RANK()?',
   'ROW_NUMBER gives unique sequential numbers; RANK can have gaps for ties.',
   0.9000, 'Excellent — very precise answer.'),

  -- Bob Go easy
  (uid_bob, 'Go', 'easy',
   0.9500, 10, 10, TRUE,
   FALSE, ARRAY[]::TEXT[], 480, NULL, NULL, NULL, NULL),

  -- Bob Go medium
  (uid_bob, 'Go', 'medium',
   0.8800, 10, 9, TRUE,
   FALSE, ARRAY[]::TEXT[], 800, NULL, NULL, NULL, NULL),

  -- Bob Go hard
  (uid_bob, 'Go', 'hard',
   0.8000, 10, 8, TRUE,
   FALSE, ARRAY[]::TEXT[], 1500,
   'Describe how goroutine scheduling works in the Go runtime.',
   'Go uses an M:N scheduler with G (goroutines), M (OS threads), and P (processors). Each P has a local run queue.',
   0.9200, 'Thorough answer covering the GMP model.'),

  -- Carol Python easy
  (uid_carol, 'Python', 'easy',
   0.9200, 10, 9, TRUE,
   FALSE, ARRAY['Decorators'], 600, NULL, NULL, NULL, NULL),

  -- Carol Python medium
  (uid_carol, 'Python', 'medium',
   0.8500, 10, 9, TRUE,
   FALSE, ARRAY['Async/await'], 950, NULL, NULL, NULL, NULL),

  -- Carol React failed (auto-submitted)
  (uid_carol, 'React.js', 'easy',
   0.4000, 10, 4, FALSE,
   TRUE, ARRAY['JSX', 'Props vs State'], 901,
   NULL, NULL, NULL, NULL);

-- ============================================================================
-- 6. HACKATHON  (owned by Alice)
-- ============================================================================
INSERT INTO public.hackathons (
  id, user_id, team_name, problem_statement, old_idea,
  attended_at, analysis_complete, team_analysis, personal_analysis,
  project_blueprint, team_complementarity
)
VALUES (
  hack_id, uid_alice,
  'Synapse Squad',
  'Build an AI-powered platform that matches student developers to open-source projects based on their verified skill scores.',
  'Originally planned a simple job board but pivoted to skill-based matching.',
  '2026-07-15',
  TRUE,
  'Team had strong frontend (Alice) and backend (Bob) coverage. Carol brought ML expertise. Communication was excellent; main gap was deployment knowledge.',
  'Alice led the UI design and React components. Managed state well under pressure. Should improve PostgreSQL query optimisation.',
  '## Architecture
- Next.js frontend (Alice)
- Go microservice for matching (Bob)
- Python ML model for skill scoring (Carol)
- Supabase as the primary database',
  '{"frontend": "strong", "backend": "strong", "ml": "strong", "devops": "medium"}'::JSONB
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 7. HACKATHON MEMBERS
-- ============================================================================
INSERT INTO public.hackathon_members (
  hackathon_id, user_id, email, name,
  test_completed, skill_scores, invite_accepted
)
VALUES
  (hack_id, uid_alice, 'alice@skillsync.demo', 'Alice Sharma',
   TRUE,  '{"React.js": 0.80, "PostgreSQL": 0.75}'::JSONB, TRUE),
  (hack_id, uid_bob,   'bob@skillsync.demo',   'Bob Krishnan',
   TRUE,  '{"Go": 0.88, "Docker": 0.82}'::JSONB,           TRUE),
  (hack_id, uid_carol, 'carol@skillsync.demo', 'Carol Mendes',
   TRUE,  '{"Python": 0.92, "MongoDB": 0.68}'::JSONB,      TRUE)
ON CONFLICT (hackathon_id, email) DO NOTHING;

-- ============================================================================
-- 8. HACKATHON INVITES
-- ============================================================================
INSERT INTO public.hackathon_invites (
  hackathon_id, inviter_id, invitee_id, invitee_email, status, responded_at
)
VALUES
  -- Alice invited Bob (accepted)
  (hack_id, uid_alice, uid_bob,   'bob@skillsync.demo',   'accepted', NOW() - INTERVAL '8 days'),
  -- Alice invited Carol (accepted)
  (hack_id, uid_alice, uid_carol, 'carol@skillsync.demo', 'accepted', NOW() - INTERVAL '7 days')
ON CONFLICT (hackathon_id, invitee_id) DO NOTHING;

-- ============================================================================
-- 9. HACKATHON PEER REVIEWS
--    Bob reviews Alice, Carol reviews Alice, Alice reviews Bob, Carol reviews Bob
-- ============================================================================
INSERT INTO public.hackathon_peer_reviews (
  hackathon_id, reviewer_id, reviewee_id,
  contribution_rating, communication_rating, technical_rating, comment
)
VALUES
  -- Bob → Alice
  (hack_id, uid_bob, uid_alice,
   5, 5, 4, 'Alice was the glue of the team. Led the UI perfectly and kept everyone on track.'),
  -- Carol → Alice
  (hack_id, uid_carol, uid_alice,
   4, 5, 4, 'Great communicator. Very organised. Wish she had more backend experience.'),
  -- Alice → Bob
  (hack_id, uid_alice, uid_bob,
   5, 4, 5, 'Bob''s Go microservice was incredibly fast and well documented.'),
  -- Carol → Bob
  (hack_id, uid_carol, uid_bob,
   5, 4, 5, 'Bob delivered a rock-solid API under time pressure. Impressive.'),
  -- Alice → Carol
  (hack_id, uid_alice, uid_carol,
   4, 4, 5, 'Carol''s ML model was the secret weapon. Needed a bit more time on integration.'),
  -- Bob → Carol
  (hack_id, uid_bob, uid_carol,
   4, 5, 5, 'Carol explained complex ML concepts clearly to the whole team. Great work.')
ON CONFLICT (hackathon_id, reviewer_id, reviewee_id) DO NOTHING;

-- ============================================================================
-- 10. HACKATHON TEAM DISMISSALS  (Carol dismissed a suggested team earlier)
-- ============================================================================
INSERT INTO public.hackathon_team_dismissals (hackathon_id, user_id)
VALUES (hack_id, uid_carol)
ON CONFLICT (hackathon_id, user_id) DO NOTHING;

-- ============================================================================
-- Done! Summary of seed data:
--   profiles:                    alice_dev, bob_builds, carol_codes
--   user_skills:                 9 rows
--   user_interests:              9 rows
--   skill_progress:              9 rows (with verified_at timestamps)
--   test_sessions:               9 rows (3 with AI followup data)
--   hackathons:                  1 row  (Synapse Squad)
--   hackathon_members:           3 rows
--   hackathon_invites:           2 rows
--   hackathon_peer_reviews:      6 rows
--   hackathon_team_dismissals:   1 row
--
-- Login credentials for all demo accounts:
--   Email: alice@skillsync.demo | bob@skillsync.demo | carol@skillsync.demo
--   Password: Password123!
-- ============================================================================

END $$;
