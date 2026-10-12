import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ieqqzuctkeafawtqkyzd.supabase.co'
const supabaseAnonKey = 'sb_publishable_yPPCxCknw4MoVHk3wbbNrQ_YJIZ4aTC'
const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function run() {
  const res = await fetch(`${supabaseUrl}/rest/v1/rpc/get_policies?table_name=hackathon_members`, {
      headers: { apikey: supabaseAnonKey, Authorization: `Bearer ${supabaseAnonKey}` }
  })
  if(res.ok) {
     console.log(await res.json())
  } else {
     // fallback: try querying pg_policies via rpc if it exists, or just query pg_policies if we have a secret key.
     console.log('Cannot fetch policies without a custom RPC.')
  }
}
run()
