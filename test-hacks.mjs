import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envFile = fs.readFileSync('.env.local', 'utf8');
const urlMatch = envFile.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/);
const keyMatch = envFile.match(/NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=(.+)/);

const supabase = createClient(urlMatch[1].trim(), keyMatch[1].trim());

async function run() {
  const { data: hacks, error: err } = await supabase.from('hackathons').select('*');
  console.log('Hackathons fetched:', hacks);
  console.log('Error:', err);
}

run();
