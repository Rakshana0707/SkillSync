import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ieqqzuctkeafawtqkyzd.supabase.co'
const supabaseAnonKey = 'sb_publishable_yPPCxCknw4MoVHk3wbbNrQ_YJIZ4aTC'
const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function run() {
  const { data: hacks, error: hacksErr } = await supabase.from('hackathons').select('*')
  console.log('Hackathons:', hacks, hacksErr)

  const { data: mems, error: memsErr } = await supabase.from('hackathon_members').select('*')
  console.log('Members:', mems, memsErr)
  
  const { data: invites, error: invitesErr } = await supabase.from('hackathon_invites').select('*')
  console.log('Invites:', invites, invitesErr)
}

run()
