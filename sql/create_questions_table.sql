-- Create the questions table
CREATE TABLE IF NOT EXISTS public.questions (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  skill        TEXT NOT NULL,
  level        TEXT NOT NULL,
  question     TEXT NOT NULL,
  options      TEXT[] NOT NULL,
  correct      INT NOT NULL,
  explanation  TEXT,
  concepts     TEXT[],
  use_count    INT NOT NULL DEFAULT 1,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS and add public access policies
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "questions: select" ON public.questions;
CREATE POLICY "questions: select" ON public.questions FOR SELECT USING (true);

DROP POLICY IF EXISTS "questions: insert" ON public.questions;
CREATE POLICY "questions: insert" ON public.questions FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "questions: update" ON public.questions;
CREATE POLICY "questions: update" ON public.questions FOR UPDATE USING (true);
