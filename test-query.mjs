import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);

async function run() {
  const { data, error } = await supabase.from('hackathon_invites').select(`
    id,
    hackathon_id,
    inviter_id,
    invitee_id,
    invitee_email,
    status,
    created_at,
    hackathons ( team_name, problem_statement ),
    profiles!inviter_id ( full_name, email )
  `).limit(1);
  console.log("Error 1:", error);

  const { data: d2, error: e2 } = await supabase.from('hackathon_invites').select(`
    id,
    profiles!hackathon_invites_inviter_id_fkey ( full_name, email )
  `).limit(1);
  console.log("Error 2:", e2);
}

run();
