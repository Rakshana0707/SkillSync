-- Drop the incorrect policy first
DROP POLICY IF EXISTS "hackathons: member select" ON public.hackathons;

-- Create the correct policy
-- Use hackathons.id explicitly to avoid ambiguity with hackathon_members.id
CREATE POLICY "hackathons: member select" ON public.hackathons FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.hackathon_members 
    WHERE hackathon_members.hackathon_id = hackathons.id 
    AND hackathon_members.user_id = auth.uid()
  )
);
