# SkillSync — Auth Page SQL Queries

SQL queries needed specifically for the **Signup & Login** flow.

---

## 1. Enable Extensions

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

---

## 2. Create Tables

### `profiles` — stores user info collected during signup

```sql
CREATE TABLE public.profiles (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name       TEXT NOT NULL,
  username        TEXT UNIQUE NOT NULL,
  email           TEXT UNIQUE NOT NULL,
  password_hash   TEXT,
  phone           TEXT,
  avatar_url      TEXT,
  role            TEXT NOT NULL DEFAULT 'student'
                    CHECK (role IN ('student', 'professional')),
  year_of_study   TEXT,
  theme           TEXT NOT NULL DEFAULT 'dark',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### `user_skills` — skills added during signup (Step 2)

```sql
CREATE TABLE public.user_skills (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  skill_name    TEXT NOT NULL,
  category      TEXT,
  current_level TEXT NOT NULL DEFAULT 'not_started'
                  CHECK (current_level IN ('not_started','easy','medium','hard')),
  easy_cleared  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, skill_name)
);
```

### `user_interests` — interests added during signup (Step 2)

```sql
CREATE TABLE public.user_interests (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  interest_name TEXT NOT NULL,
  added_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, interest_name)
);
```

---

## 3. Row Level Security (RLS)

Since we are using a custom auth flow without Supabase Auth, RLS is disabled for these tables. Ensure your client-side code handles validation securely.

```sql
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_skills DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_interests DISABLE ROW LEVEL SECURITY;
```

---

## 5. Frontend Code — Signup Flow

```ts
// Step 1: Create auth user
const { data, error } = await supabase.auth.signUp({
  email,
  password,
  options: {
    data: {
      full_name: fullName,
      username,
      role,           // 'student' | 'professional'
      year_of_study: year,
    }
  }
})

if (error) throw error

const uid = data.user!.id

// Step 2: Insert skills
await supabase.from('user_skills').insert(
  selectedSkills.map(s => ({
    user_id: uid,
    skill_name: s.name,
    category: s.category,
  }))
)

// Step 3: Insert interests
await supabase.from('user_interests').insert(
  selectedInterests.map(i => ({
    user_id: uid,
    interest_name: i,
  }))
)

// Redirect
window.location.href = '/dashboard'
```

---

## 6. Frontend Code — Login Flow

```ts
const { data, error } = await supabase.auth.signInWithPassword({
  email,
  password,
})

if (error) throw error

window.location.href = '/dashboard'
```

---

## 7. Frontend Code — OAuth (Google / GitHub)

```ts
await supabase.auth.signInWithOAuth({
  provider: 'google', // or 'github'
  options: {
    redirectTo: `${window.location.origin}/auth/callback`,
  }
})
```

---

## 8. Frontend Code — Forgot Password

```ts
await supabase.auth.resetPasswordForEmail(email, {
  redirectTo: `${window.location.origin}/auth/reset-password`,
})
```

---

## Quick Reference

| Table | Used for |
|---|---|
| `profiles` | Stores name, username, email, phone, role, year |
| `user_skills` | Skills picked in signup Step 2 |
| `user_interests` | Interests picked in signup Step 2 |
| `auth.users` | Managed by Supabase — email + password stored here |
