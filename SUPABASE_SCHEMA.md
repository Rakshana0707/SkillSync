# SkillSync — Full Supabase Database Schema

Run every block in order inside the Supabase **SQL Editor**.

## 1. Environment Setup

Create `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
OPENAI_API_KEY=your-openai-api-key-here
RESEND_API_KEY=your-resend-api-key-here
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-cloudinary-api-key
CLOUDINARY_API_SECRET=your-cloudinary-api-secret
```

## 2. Extensions
```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
```

## 3. Updated_at trigger
```sql
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

## 4. Profiles table
```sql
CREATE TABLE public.profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name       TEXT NOT NULL,
  username        TEXT UNIQUE NOT NULL,
  email           TEXT UNIQUE NOT NULL,
  phone           TEXT,
  avatar_url      TEXT,
  bio             TEXT,
  role            TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'professional')),
  year_of_study   TEXT,
  theme           TEXT NOT NULL DEFAULT 'dark' CHECK (theme IN ('dark', 'light', 'system')),
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles: owner select" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles: owner update" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "profiles: owner insert" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
```

## 5. User Skills
```sql
CREATE TABLE public.user_skills (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  skill_name  TEXT NOT NULL,
  category    TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, skill_name)
);
ALTER TABLE public.user_skills ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_skills: owner all" ON public.user_skills USING (auth.uid() = user_id);
```

## 6. User Interests
```sql
CREATE TABLE public.user_interests (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  interest_name TEXT NOT NULL,
  UNIQUE(user_id, interest_name)
);
ALTER TABLE public.user_interests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_interests: owner all" ON public.user_interests USING (auth.uid() = user_id);
```

## 7. Test Sessions
```sql
CREATE TABLE public.test_sessions (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  skill               TEXT NOT NULL,
  level               TEXT NOT NULL CHECK (level IN ('easy', 'medium', 'hard')),
  score               NUMERIC(5,4),
  total_questions     INT NOT NULL DEFAULT 10,
  correct_answers     INT,
  passed              BOOLEAN,
  auto_submitted      BOOLEAN DEFAULT FALSE,
  auto_submit_reason  TEXT,
  weak_concepts       TEXT[],
  time_taken_sec      INT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.test_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "test_sessions: owner all" ON public.test_sessions USING (auth.uid() = user_id);
```

## 8. Skill Progress
```sql
CREATE TABLE public.skill_progress (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  skill_name        TEXT NOT NULL,
  easy_completed    BOOLEAN DEFAULT FALSE,
  medium_completed  BOOLEAN DEFAULT FALSE,
  hard_completed    BOOLEAN DEFAULT FALSE,
  easy_score        NUMERIC(5,4),
  medium_score      NUMERIC(5,4),
  hard_score        NUMERIC(5,4),
  weak_concepts     TEXT[],
  tests_attempted   INT DEFAULT 0,
  last_attempt      TIMESTAMPTZ,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, skill_name)
);
CREATE TRIGGER trg_skill_progress_updated_at BEFORE UPDATE ON public.skill_progress
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
ALTER TABLE public.skill_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "skill_progress: owner all" ON public.skill_progress USING (auth.uid() = user_id);
```

## 9. Hackathons
```sql
CREATE TABLE public.hackathons (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  team_name           TEXT NOT NULL,
  problem_statement   TEXT NOT NULL,
  old_idea            TEXT,
  attended_at         DATE,
  analysis_complete   BOOLEAN DEFAULT FALSE,
  team_analysis       TEXT,
  personal_analysis   TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TRIGGER trg_hackathons_updated_at BEFORE UPDATE ON public.hackathons
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
ALTER TABLE public.hackathons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hackathons: owner all" ON public.hackathons USING (auth.uid() = user_id);
```

## 10. Hackathon Members
```sql
CREATE TABLE public.hackathon_members (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hackathon_id    UUID NOT NULL REFERENCES public.hackathons(id) ON DELETE CASCADE,
  user_id         UUID REFERENCES public.profiles(id),
  email           TEXT NOT NULL,
  name            TEXT,
  test_completed  BOOLEAN DEFAULT FALSE,
  skill_scores    JSONB,
  joined_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(hackathon_id, email)
);
ALTER TABLE public.hackathon_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hackathon_members: read" ON public.hackathon_members FOR SELECT USING (TRUE);
CREATE POLICY "hackathon_members: owner insert" ON public.hackathon_members FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.hackathons WHERE id = hackathon_id AND user_id = auth.uid()));
CREATE POLICY "hackathon_members: member delete" ON public.hackathon_members FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "hackathon_members: owner delete" ON public.hackathon_members FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.hackathons WHERE id = hackathon_id AND user_id = auth.uid())
);
```

## 11. Hackathon Invites
```sql
CREATE TABLE public.hackathon_invites (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hackathon_id    UUID NOT NULL REFERENCES public.hackathons(id) ON DELETE CASCADE,
  inviter_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  invitee_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  invitee_email   TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  responded_at    TIMESTAMPTZ,
  UNIQUE(hackathon_id, invitee_id)
);
ALTER TABLE public.hackathon_invites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hackathon_invites: read" ON public.hackathon_invites FOR SELECT USING (auth.uid() = inviter_id OR auth.uid() = invitee_id);
CREATE POLICY "hackathon_invites: owner insert" ON public.hackathon_invites FOR INSERT WITH CHECK (auth.uid() = inviter_id);
CREATE POLICY "hackathon_invites: invitee update" ON public.hackathon_invites FOR UPDATE USING (auth.uid() = invitee_id);
CREATE POLICY "hackathon_invites: inviter delete" ON public.hackathon_invites FOR DELETE USING (auth.uid() = inviter_id);
```
