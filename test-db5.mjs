import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ieqqzuctkeafawtqkyzd.supabase.co'
const supabaseAnonKey = 'sb_publishable_yPPCxCknw4MoVHk3wbbNrQ_YJIZ4aTC'
const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function run() {
  const { data: hacks } = await supabase.from('hackathons').select('*')
  const hackId = hacks[0].id

  // We are anon so we can't test RLS inserts without logging in.
  // Wait, I can just console.log the error in the Next.js app!
}
