# SkillSync — AI-Powered Skill Assessment Platform

## Tech Stack
- **Frontend**: Next.js 14 (App Router) + TypeScript + Tailwind CSS + Zustand
- **Backend**: Next.js API Routes (BFF pattern)
- **AI Engine**: OpenAI GPT-4o (MCQ generation + hackathon analysis)
- **Database**: PostgreSQL via Supabase + Prisma-like schema
- **Deploy**: Vercel (frontend) + Supabase (DB)

## Quick Start

### 1. Install dependencies
```bash
npm install
```

### 2. Set up environment variables
Copy `.env.local` and fill in all your API keys:
- **Supabase**: Create project at supabase.com → Settings → API
- **OpenAI**: platform.openai.com → API Keys (GPT-4o for questions)

### 3. Set up Supabase database
Run all SQL from `SUPABASE_SCHEMA.md` in your Supabase SQL Editor.

### 4. Run locally
```bash
npm run dev
```

Open http://localhost:3000

## Features

### Authentication
- Email/password signup with 2-step onboarding
- Google & GitHub OAuth
- Profile creation with skills + interests

### Skill Tests
- AI-generated MCQ questions (10 per test) using GPT-4o
- Levels: Easy → Medium → Hard (sequential unlock)
- Time limits: Easy 15min, Medium 25min, Hard 40min
- Pass threshold: 60%
- **Proctoring**:
  - Camera required (face detection)
  - Tab switch = auto-submit
  - 3 movement warnings → auto-submit
- Weak concept tracking + study suggestions

### Dashboard
- Overall test statistics
- Per-skill progress (easy/medium/hard)
- Hackathon readiness indicator
- Next test recommendations

### Profile
- Name, username, email, phone
- Role (student/professional) + year
- Bio

### Settings
- Theme (dark/light/system)
- Skills management (add/remove)
- Interests management
- Help & support links

### Hackathon Module
- Requires clearing ALL easy levels first
- Add hackathon with team name, problem statement, members
- Member notification system (email invites)
- AI-powered team + personal analysis
- Previous hackathon tracking

## API Keys Needed

| Service | Purpose | Where to get |
|---------|---------|--------------|
| Supabase URL + Anon Key | Database + Auth | supabase.com |
| OpenAI API Key | MCQ generation, analysis | platform.openai.com |

## Project Structure
```
skillsync/
├── app/
│   ├── page.tsx              # Landing/auth page
│   ├── dashboard/page.tsx    # User dashboard
│   ├── test/
│   │   ├── page.tsx          # Test selection
│   │   └── session/page.tsx  # Active test with proctoring
│   ├── profile/page.tsx      # User profile
│   ├── settings/page.tsx     # Settings + skill management
│   ├── hackathon/page.tsx    # Hackathon module
│   └── api/
│       ├── generate-questions/route.ts  # GPT-4o question gen
│       └── analyze-hackathon/route.ts  # Team analysis
├── components/
│   ├── auth/                 # Login, Signup components
│   └── layout/               # Sidebar, TopBar, AppShell
├── store/
│   ├── authStore.ts          # Auth state (Zustand)
│   └── appStore.ts           # App state (Zustand)
├── types/index.ts            # All TypeScript types
├── lib/supabase.ts           # Supabase client
├── .env.local                # API keys (fill these in!)
└── SUPABASE_SCHEMA.md        # Full DB schema SQL
```
