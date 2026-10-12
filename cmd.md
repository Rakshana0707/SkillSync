# SkillSync — Commands & Setup Guide

This guide lists all the commands and configuration steps required to run, build, and maintain the SkillSync application locally.

---

## 1. Installation

Install all required dependencies (defined in `package.json`):

```bash
npm install
```

---

## 2. Environment Variables

Before running the application, ensure you have configured your local environment file:

```bash
# Create/Configure .env.local with the required keys
```

Ensure the following variables are defined in `.env.local`:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-supabase-publishable-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# OpenAI API Key (Required for AI MCQ question generation & analysis)
OPENAI_API_KEY=your-openai-api-key-here

# Resend API Key (For sending transactional emails/invites)
RESEND_API_KEY=your-resend-api-key-here

# Cloudinary Credentials (For profile avatars and media uploads)
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your-cloudinary-cloud-name
CLOUDINARY_API_KEY=your-cloudinary-api-key
CLOUDINARY_API_SECRET=your-cloudinary-api-secret

# Razorpay Credentials (Optional, for payment integration)
NEXT_PUBLIC_RAZORPAY_KEY_ID=your-razorpay-key-id
RAZORPAY_KEY_SECRET=your-razorpay-key-secret

# Analytics & Error Monitoring (Optional)
NEXT_PUBLIC_POSTHOG_KEY=your-posthog-key
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com
NEXT_PUBLIC_SENTRY_DSN=your-sentry-dsn
```

---

## 3. Database Setup (Supabase)

SkillSync uses **Supabase** (PostgreSQL) for database and authentication. Run the SQL schemas in your Supabase project's **SQL Editor**:

1. Run the SQL statements in [AUTH_SQL.md](file:///c:/Users/Neevetha%20N/Downloads/skillsync-complete/skillsync/AUTH_SQL.md) to set up tables, triggers, and Row Level Security (RLS) for authentication.
2. Run the SQL statements in [SUPABASE_SCHEMA.md](file:///c:/Users/Neevetha%20N/Downloads/skillsync-complete/skillsync/SUPABASE_SCHEMA.md) to set up tables and triggers for skills, tests, and hackathons.

---

## 4. Running the Project

### Development Server
Run the local Next.js development server:

```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser to view the application.

### Production Build
Build and run the production bundle locally:

```bash
# 1. Build the Next.js application
npm run build

# 2. Start the production server
npm run start
```

---

## 5. Other Commands

### Code Linting
Run ESLint to check for code formatting and quality issues:

```bash
npm run lint
```
