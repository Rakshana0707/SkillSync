import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);

async function checkInvites() {
  const { data, error } = await supabase
    .from('hackathon_invites')
    .select(`
      id,
      hackathons ( team_name ),
      inviter:profiles!hackathon_invites_inviter_id_fkey ( full_name, email ),
      invitee:profiles!hackathon_invites_invitee_id_fkey ( full_name, email )
    `).limit(1);
    
  console.log('Result:', data, error);
}

checkInvites();
