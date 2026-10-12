import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY); // Using service role to bypass RLS and inspect

async function checkInvites() {
  const { data: invites, error: iErr } = await supabase.from('hackathon_invites').select('*');
  console.log('Invites:', invites, iErr);

  const { data: members, error: mErr } = await supabase.from('hackathon_members').select('*');
  console.log('Members:', members, mErr);
}

checkInvites();
