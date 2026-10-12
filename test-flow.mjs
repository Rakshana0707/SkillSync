import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);

async function run() {
  // 1. Get any two profiles
  const { data: profiles, error: pErr } = await supabase.from('profiles').select('*').limit(2);
  if (pErr) return console.error("Profile fetch error:", pErr);
  if (profiles.length < 2) return console.log("Need at least 2 profiles");

  const creator = profiles[0];
  const invitee = profiles[1];
  console.log("Creator:", creator.email);
  console.log("Invitee:", invitee.email);

  // 2. Fetch invites for invitee
  const { data: invites, error: invErr } = await supabase
    .from('hackathon_invites')
    .select(`
      id,
      hackathon_id,
      inviter_id,
      invitee_id,
      invitee_email,
      status,
      created_at,
      hackathons ( team_name, problem_statement ),
      inviter:profiles!hackathon_invites_inviter_id_fkey ( full_name, email ),
      invitee:profiles!hackathon_invites_invitee_id_fkey ( full_name, email )
    `)
    .or(`invitee_id.eq.${invitee.id},inviter_id.eq.${invitee.id}`)
    .order('created_at', { ascending: false });

  console.log("Invites fetch error:", invErr);
  console.log("Invites found:", invites?.length);
  if (invites && invites.length > 0) {
    console.log("First invite:", JSON.stringify(invites[0], null, 2));
  }
}

run();
