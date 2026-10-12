# SkillSync — July 2026 Feature Update

This update adds the features discussed, on top of the existing app, without
touching your "always fresh AI questions, never cached" design.

## Setup — do this first

1. Open your existing Supabase project → SQL Editor.
2. Paste and run **`sql/sql1.sql`** (in this zip) once. It only adds new
   columns/tables/functions — it never drops or rewrites anything you already
   have. It's safe to re-run if something fails partway.
3. Nothing else to configure — same `.env` variables as before.

## What's new

### 1. Retake cooldown (anti-farming)
After a failed/auto-submitted attempt, the same skill+level is locked for
30 minutes (`RETEST_COOLDOWN_MINUTES` in `types/index.ts`). Enforced both on
the `/test` list page and on `/test/session` directly (in case of a direct
link/refresh). Passing a level still locks it normally, as before.

### 2. Skill decay / re-verification (expiring badges)
A passed level now stores `*_verified_at`. After `BADGE_VALIDITY_DAYS` (90,
in `types/index.ts`) it's shown as **"↻ Re-verify"** on the dashboard, the
test list, and the public badge page, and becomes retakeable again — keeping
"verified" claims meaningful over time.

### 3. Leaderboard (`/leaderboard`)
Per-skill rankings pulled from a `SECURITY DEFINER` Postgres function
(`get_leaderboard`) so it works across users without loosening your existing
row-level security on `skill_progress`.

### 4. Shareable public badge (`/badge/[username]`)
A public, unauthenticated page anyone can view — think "Verified: React
(Hard) — 87%". Includes a "Download badge (PNG)" button (canvas-rendered
certificate) and a "Copy share link" button. Linked from the Profile page and
from the test result screen after a pass. Powered by another
`SECURITY DEFINER` function (`get_public_profile`) that deliberately excludes
email/phone/etc.

### 5. AI "explain your answer" bonus round
After an MCQ test (not auto-submitted), if you got anything wrong, you're
offered one free-text follow-up question on a weak concept
(`/api/generate-followup`), graded by AI (`/api/score-followup`). This is
**purely informational** — it's stored on the `test_sessions` row but never
changes your pass/fail result, so it can't be gamed and can't unfairly fail
someone either.

### 6. Hackathon peer review + collaboration score
On the hackathon analysis page, teammates can rate each other 1–5 on
contribution / communication / technical skill, with an optional comment.
Averaged "collaboration scores" are shown to the whole team via another
`SECURITY DEFINER` function. RLS ensures you can only review people who are
actually members of that hackathon team, and you can't review yourself.

### 7. Team skill complementarity
`analyze-hackathon` now computes an objective (non-AI) skill-category
coverage map — who covers Frontend/Backend/Database/etc. — and a 0–100
complementarity score, and feeds that into the AI prompt so recommendations
are grounded in real data instead of guesses. It's shown on the analysis page
alongside the AI write-up.

### 8. Bug fixes along the way
- The OpenRouter model IDs in `generate-questions` and `generate-roadmap`
  (`nvidia/nemotron-3-nano-30b-a3b:free`, `poolside/laguna-xs.2:free`,
  `cohere/north-mini-code:free`) don't correspond to real OpenRouter models —
  every call was likely silently falling through to mock questions. Replaced
  with the same real free models `analyze-hackathon` already uses
  successfully.
- Your code references a `project_blueprint` column and a
  `hackathon_team_dismissals` table/`invite_accepted` column that weren't in
  `SUPABASE_SCHEMA.md`. `sql1.sql` adds them defensively (`IF NOT EXISTS`) in
  case your live database was missing them.

## Deliberately NOT built in this pass

Two of the "bigger bets" from the original brainstorm are large enough to be
their own projects rather than something to bolt on safely in one sitting:

- **Live pair-coding sandbox** — needs a real, sandboxed multi-language code
  execution backend (not something safely improvised without a dedicated
  execution service).
- **Full recruiter/company portal** — a proper multi-tenant version needs its
  own org signup flow, roles, and RLS model, separate from personal accounts.
  The **public badge page** covers the "share verified skills externally"
  need in the meantime — a recruiter can already be sent a `/badge/username`
  link today.

Happy to scope either of these as a dedicated follow-up whenever you want to
tackle them.
