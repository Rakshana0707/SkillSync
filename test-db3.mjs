import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function run() {
  const { data: hacks } = await supabase.from('hackathons').select('*')
  console.log('Hackathons:', hacks)

  const { data: mems } = await supabase.from('hackathon_members').select('*')
  console.log('Members:', mems)
}

run()
