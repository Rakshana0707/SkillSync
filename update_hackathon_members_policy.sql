-- Fix for candidates not being able to accept hackathon invites due to missing RLS policy
-- This policy allows a user to update their own row in the hackathon_members table
CREATE POLICY "hackathon_members: self update" ON public.hackathon_members
  FOR UPDATE USING (auth.uid() = user_id);
