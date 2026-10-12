import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
// Using the service key for bypassing RLS during testing would be better, but we don't have it.
// We only have PUBLISHABLE_KEY.
// So we can only fetch data. We can't insert unless we are authenticated.

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  // Let's just fetch the LATEST hackathon invite created
  const { data: invites, error: invErr } = await supabase
    .from('hackathon_invites')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);

  console.log("Latest Invites error:", invErr);
  console.log("Latest Invites:", invites);
}

run();
